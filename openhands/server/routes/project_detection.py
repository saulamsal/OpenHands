"""
Project detection API endpoints.
"""
import json
from typing import Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from openhands.core.logger import openhands_logger as logger
from openhands.server.auth.dependencies import get_user_id
from openhands.server.shared import conversation_manager
from openhands.events.action.files import FileReadAction
from openhands.server.file_config import is_extension_allowed
from openhands.storage import get_file_store
from openhands.core.config import load_openhands_config
from openhands.storage.database.models import ConversationDB
from openhands.storage.database.session import get_sync_session_maker

app = APIRouter(prefix="/project-detection", tags=["project-detection"])

class ProjectDetectionResult(BaseModel):
    """Result of project type detection."""
    project_type: str
    confidence: int
    detected_features: List[str]

class DetectionConfig(BaseModel):
    """Configuration for a project type detector."""
    type: str  # file, dependency, devDependency, fileContent
    pattern: str
    path: Optional[str] = None
    weight: int = 1

PROJECT_CONFIGS = {
    "EXPO": {
        "name": "Expo",
        "detectors": [
            {"type": "file", "pattern": "app.json", "weight": 3},
            {"type": "file", "pattern": "app.config.js", "weight": 3},
            {"type": "file", "pattern": "eas.json", "weight": 5},
            {"type": "dependency", "pattern": "expo", "weight": 5},
            {"type": "fileContent", "pattern": '"expo"', "path": "app.json", "weight": 5},
        ]
    },
    "NEXTJS": {
        "name": "Next.js",
        "detectors": [
            {"type": "file", "pattern": "next.config.js", "weight": 5},
            {"type": "file", "pattern": "next.config.ts", "weight": 5},
            {"type": "dependency", "pattern": "next", "weight": 5},
        ]
    },
    "LARAVEL": {
        "name": "Laravel",
        "detectors": [
            {"type": "file", "pattern": "artisan", "weight": 5},
            {"type": "file", "pattern": "composer.json", "weight": 2},
            {"type": "fileContent", "pattern": "laravel/framework", "path": "composer.json", "weight": 5},
        ]
    },
    "DJANGO": {
        "name": "Django",
        "detectors": [
            {"type": "file", "pattern": "manage.py", "weight": 5},
            {"type": "fileContent", "pattern": "django", "path": "requirements.txt", "weight": 4},
        ]
    },
    "RAILS": {
        "name": "Ruby on Rails",
        "detectors": [
            {"type": "file", "pattern": "Gemfile", "weight": 2},
            {"type": "fileContent", "pattern": "gem 'rails'", "path": "Gemfile", "weight": 5},
        ]
    },
    "REACT": {
        "name": "React",
        "detectors": [
            {"type": "dependency", "pattern": "react", "weight": 3},
            {"type": "dependency", "pattern": "react-dom", "weight": 3},
        ]
    },
    "VUE": {
        "name": "Vue",
        "detectors": [
            {"type": "dependency", "pattern": "vue", "weight": 5},
            {"type": "file", "pattern": "vue.config.js", "weight": 4},
        ]
    },
    "ANGULAR": {
        "name": "Angular",
        "detectors": [
            {"type": "file", "pattern": "angular.json", "weight": 5},
            {"type": "dependency", "pattern": "@angular/core", "weight": 5},
        ]
    },
}

@app.post('/detect/{conversation_id}')
async def detect_project_type(
    conversation_id: str,
    user_id: str | None = Depends(get_user_id),
) -> ProjectDetectionResult:
    """
    Detect the project type for a conversation by checking files in the workspace.
    """
    logger.info(
        f'Detecting project type for conversation {conversation_id}',
        extra={'conversation_id': conversation_id, 'user_id': user_id},
    )

    # Get the conversation session
    session = conversation_manager.get_session(conversation_id)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail='Conversation not found',
        )

    # Check if runtime is ready
    runtime = session.runtime
    if not runtime:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail='Runtime not initialized',
        )

    scores: Dict[str, int] = {}
    features: Dict[str, List[str]] = {}

    # Helper to check if file exists
    def check_file_exists(path: str) -> bool:
        try:
            action = FileReadAction(path=path, thought="Checking file existence")
            observation = runtime.run_action(action)
            return observation.success if hasattr(observation, 'success') else False
        except Exception:
            return False

    # Helper to read file content
    def read_file(path: str) -> Optional[str]:
        try:
            if not is_extension_allowed(path):
                return None
            action = FileReadAction(path=path, thought="Reading file for project detection")
            observation = runtime.run_action(action)
            if hasattr(observation, 'content'):
                return observation.content
            return None
        except Exception:
            return None

    # Check package.json first
    package_json_content = read_file("package.json")
    package_json = None
    if package_json_content:
        try:
            package_json = json.loads(package_json_content)
        except json.JSONDecodeError:
            pass

    # Check composer.json for PHP projects
    composer_json_content = read_file("composer.json")
    composer_json = None
    if composer_json_content:
        try:
            composer_json = json.loads(composer_json_content)
        except json.JSONDecodeError:
            pass

    # Run detection for each project type
    for project_type, config in PROJECT_CONFIGS.items():
        score = 0
        project_features = []

        for detector in config["detectors"]:
            weight = detector.get("weight", 1)
            detected = False

            if detector["type"] == "file":
                # Check if file exists
                if check_file_exists(detector["pattern"]):
                    detected = True
                    project_features.append(f"File: {detector['pattern']}")

            elif detector["type"] == "dependency" and package_json:
                # Check in dependencies
                deps = package_json.get("dependencies", {})
                if detector["pattern"] in deps:
                    detected = True
                    project_features.append(f"Dependency: {detector['pattern']}")

            elif detector["type"] == "devDependency" and package_json:
                # Check in devDependencies
                dev_deps = package_json.get("devDependencies", {})
                if detector["pattern"] in dev_deps:
                    detected = True
                    project_features.append(f"Dev dependency: {detector['pattern']}")

            elif detector["type"] == "fileContent" and detector.get("path"):
                # Check file content
                content = read_file(detector["path"])
                if content and detector["pattern"] in content:
                    detected = True
                    project_features.append(f"Pattern in {detector['path']}")

            if detected:
                score += weight

        if score > 0:
            scores[project_type] = score
            features[project_type] = project_features

    # Find the best match
    if not scores:
        return ProjectDetectionResult(
            project_type="UNKNOWN",
            confidence=0,
            detected_features=[]
        )

    best_type = max(scores, key=scores.get)
    total_score = sum(scores.values())
    confidence = min(100, int((scores[best_type] / total_score) * 100))

    return ProjectDetectionResult(
        project_type=best_type,
        confidence=confidence,
        detected_features=features.get(best_type, [])
    )


class BatchDetectionRequest(BaseModel):
    """Request for batch detection of project types."""
    limit: int = 10
    only_missing: bool = True


class BatchDetectionResult(BaseModel):
    """Result of batch project detection."""
    processed: int
    detected: int
    failed: int
    results: Dict[str, str]  # conversation_id -> project_type


@app.post('/detect-batch')
async def detect_batch_project_types(
    request: BatchDetectionRequest,
    user_id: str | None = Depends(get_user_id),
) -> BatchDetectionResult:
    """
    Detect project types for multiple conversations in batch.
    Useful for processing existing conversations without project types.
    """
    logger.info(
        f'Starting batch project detection for user {user_id}',
        extra={'user_id': user_id, 'limit': request.limit},
    )
    
    processed = 0
    detected = 0
    failed = 0
    results = {}
    
    SessionLocal = get_sync_session_maker()
    db = SessionLocal()
    try:
        # Query conversations that need detection
        query = db.query(ConversationDB).filter(
            ConversationDB.user_id == user_id
        )
        
        if request.only_missing:
            # Only get conversations without project type
            query = query.filter(
                (ConversationDB.project_type == None) | 
                (ConversationDB.project_type == "UNKNOWN")
            )
        
        # Limit the batch size
        conversations = query.limit(request.limit).all()
        
        for conv in conversations:
            processed += 1
            try:
                # Try to detect project type
                result = await detect_project_type(conv.conversation_id, user_id)
                
                if result.project_type != "UNKNOWN":
                    # Update the conversation
                    conv.project_type = result.project_type
                    conv.project_detection_confidence = result.confidence
                    db.commit()
                    
                    detected += 1
                    results[conv.conversation_id] = result.project_type
                    
                    logger.info(
                        f'Detected project type {result.project_type} for conversation {conv.conversation_id}',
                        extra={
                            'conversation_id': conv.conversation_id,
                            'project_type': result.project_type,
                            'confidence': result.confidence,
                        },
                    )
            except Exception as e:
                failed += 1
                logger.error(
                    f'Failed to detect project type for conversation {conv.conversation_id}: {str(e)}',
                    extra={'conversation_id': conv.conversation_id, 'error': str(e)},
                )
    finally:
        db.close()
    
    return BatchDetectionResult(
        processed=processed,
        detected=detected,
        failed=failed,
        results=results,
    )