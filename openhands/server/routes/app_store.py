"""App Store and Google Play Store API integration routes."""

import os
import tempfile
from typing import List, Optional, Dict, Any
import httpx
from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel, Field
from openhands.core.logger import openhands_logger as logger
from openhands.server.auth.dependencies import optional_user

app = APIRouter(prefix="/api/app-store", tags=["app-store"])

# RapidAPI configuration
RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY", "14d4bd2909msh22520c063157ef3p11d4f6jsna93efd8f107b")
RAPIDAPI_HOST = "app-stores.p.rapidapi.com"
RAPIDAPI_BASE_URL = f"https://{RAPIDAPI_HOST}"

# Request timeout and retry configuration
TIMEOUT = 30.0
MAX_RETRIES = 3


class AppIcon(BaseModel):
    """App icon URLs in different sizes."""
    small: str = Field(..., description="Small icon URL (60x60)")
    medium: str = Field(..., description="Medium icon URL (100x100)")
    large: str = Field(..., description="Large icon URL (512x512)")


class AppDeveloper(BaseModel):
    """App developer information."""
    id: int = Field(..., description="Developer ID")
    name: str = Field(..., description="Developer name")
    url: Optional[str] = Field(None, description="Developer URL")
    website: Optional[str] = Field(None, description="Developer website")


class AppRatings(BaseModel):
    """App ratings information."""
    average: float = Field(..., description="Average rating")
    total: int = Field(..., description="Total number of ratings")


class AppPrice(BaseModel):
    """App pricing information."""
    raw: float = Field(..., description="Raw price value")
    display: str = Field(..., description="Display price string")
    currency: str = Field(..., description="Currency code")


class AppInfo(BaseModel):
    """Basic app information for search results."""
    id: int = Field(..., description="App ID")
    url: str = Field(..., description="App store URL")
    name: str = Field(..., description="App name")
    category: str = Field(..., description="App category")
    content_rating: str = Field(..., description="Content rating", alias="contentRating")
    description: str = Field(..., description="App description")
    icons: AppIcon = Field(..., description="App icons")
    developer: AppDeveloper = Field(..., description="Developer information")
    ratings: AppRatings = Field(..., description="App ratings")
    price: AppPrice = Field(..., description="App pricing")
    updated_at: str = Field(..., description="Last update date", alias="updatedAt")
    current_version: str = Field(..., description="Current app version", alias="currentVersion")
    minimum_os_version: str = Field(..., description="Minimum OS version", alias="minimumOsVersion")
    app_size: str = Field(..., description="App size in bytes", alias="appSize")
    screenshots: List[str] = Field(default_factory=list, description="App screenshots")
    tablet_screenshots: List[str] = Field(default_factory=list, description="Tablet screenshots", alias="tabletScreenshots")

    class Config:
        allow_population_by_field_name = True


class AppSearchResponse(BaseModel):
    """Response model for app search."""
    apps: List[AppInfo] = Field(..., description="List of found apps")
    total: int = Field(..., description="Total number of apps found")


class AppDetailsResponse(BaseModel):
    """Response model for detailed app information."""
    app: AppInfo = Field(..., description="Detailed app information")


async def make_rapidapi_request(path: str, params: Dict[str, str]) -> Dict[str, Any]:
    """Make a request to RapidAPI App Stores API with retry logic."""
    headers = {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": RAPIDAPI_HOST,
    }
    
    url = f"{RAPIDAPI_BASE_URL}{path}"
    
    for attempt in range(MAX_RETRIES):
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT) as client:
                response = await client.get(url, headers=headers, params=params)
                
                if response.status_code == 200:
                    return response.json()
                elif response.status_code == 429:
                    # Rate limit exceeded
                    raise HTTPException(
                        status_code=429,
                        detail="Rate limit exceeded. Please try again later."
                    )
                elif response.status_code == 403:
                    # API key issue
                    raise HTTPException(
                        status_code=403,
                        detail="API access forbidden. Please check configuration."
                    )
                else:
                    logger.warning(f"RapidAPI request failed with status {response.status_code}")
                    if attempt == MAX_RETRIES - 1:
                        raise HTTPException(
                            status_code=response.status_code,
                            detail=f"App store API request failed: {response.text}"
                        )
        except httpx.TimeoutException:
            logger.warning(f"RapidAPI request timeout (attempt {attempt + 1})")
            if attempt == MAX_RETRIES - 1:
                raise HTTPException(
                    status_code=408,
                    detail="Request timeout. Please try again."
                )
        except httpx.RequestError as e:
            logger.error(f"RapidAPI request error: {e}")
            if attempt == MAX_RETRIES - 1:
                raise HTTPException(
                    status_code=503,
                    detail="Service unavailable. Please try again later."
                )


@app.get("/search", response_model=AppSearchResponse)
async def search_apps(
    term: str = Query(..., description="Search term"),
    store: str = Query(..., regex="^(apple|google)$", description="App store to search (apple or google)"),
    limit: int = Query(20, ge=1, le=50, description="Maximum number of results"),
    current_user=Depends(optional_user),
) -> AppSearchResponse:
    """
    Search for apps in App Store or Google Play Store.
    
    Args:
        term: Search term to find apps
        store: Store to search ('apple' for App Store, 'google' for Google Play)
        limit: Maximum number of results to return (1-50)
        current_user: Current authenticated user (optional)
    
    Returns:
        AppSearchResponse with list of found apps
    """
    logger.info(f"Searching {store} store for term: {term}")
    
    try:
        params = {
            "language": "en",
            "store": store,
            "term": term,
        }
        
        data = await make_rapidapi_request("/search", params)
        
        # Ensure data is a list
        if not isinstance(data, list):
            logger.error(f"Unexpected API response format: {type(data)}")
            raise HTTPException(
                status_code=500,
                detail="Unexpected API response format"
            )
        
        # Limit results
        limited_data = data[:limit]
        
        # Parse apps with error handling
        apps = []
        for app_data in limited_data:
            try:
                app = AppInfo.parse_obj(app_data)
                apps.append(app)
            except Exception as e:
                logger.warning(f"Failed to parse app data: {e}")
                continue
        
        return AppSearchResponse(apps=apps, total=len(apps))
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error searching apps: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error while searching apps"
        )


@app.get("/app/{app_id}", response_model=AppDetailsResponse)
async def get_app_details(
    app_id: int,
    store: str = Query(..., regex="^(apple|google)$", description="App store (apple or google)"),
    current_user=Depends(optional_user),
) -> AppDetailsResponse:
    """
    Get detailed information about a specific app.
    
    Args:
        app_id: App ID to get details for
        store: Store where the app is located ('apple' or 'google')
        current_user: Current authenticated user (optional)
    
    Returns:
        AppDetailsResponse with detailed app information
    """
    logger.info(f"Getting details for app {app_id} from {store} store")
    
    try:
        params = {
            "language": "en",
            "store": store,
            "id": str(app_id),
        }
        
        data = await make_rapidapi_request("/app", params)
        
        # Parse app data
        app = AppInfo.parse_obj(data)
        
        return AppDetailsResponse(app=app)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting app details: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error while fetching app details"
        )


@app.get("/screenshots/{app_id}")
async def get_app_screenshots(
    app_id: int,
    store: str = Query(..., regex="^(apple|google)$", description="App store (apple or google)"),
    current_user=Depends(optional_user),
) -> Dict[str, Any]:
    """
    Get app screenshots as base64 encoded data for conversation attachments.
    
    Args:
        app_id: App ID to get screenshots for
        store: Store where the app is located ('apple' or 'google')
        current_user: Current authenticated user (optional)
    
    Returns:
        Dictionary with screenshot URLs and base64 data
    """
    logger.info(f"Getting screenshots for app {app_id} from {store} store")
    
    try:
        # First get app details to get screenshot URLs
        app_details = await get_app_details(app_id, store, current_user)
        app = app_details.app
        
        screenshot_urls = app.screenshots + app.tablet_screenshots
        
        if not screenshot_urls:
            return {
                "screenshots": [],
                "message": "No screenshots available for this app"
            }
        
        # Download and encode screenshots (limit to first 5 for performance)
        max_screenshots = 5
        processed_screenshots = []
        
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            for i, url in enumerate(screenshot_urls[:max_screenshots]):
                try:
                    response = await client.get(url)
                    if response.status_code == 200:
                        import base64
                        
                        # Get content type
                        content_type = response.headers.get("content-type", "image/jpeg")
                        
                        # Encode to base64
                        base64_data = base64.b64encode(response.content).decode('utf-8')
                        
                        processed_screenshots.append({
                            "url": url,
                            "base64": f"data:{content_type};base64,{base64_data}",
                            "content_type": content_type,
                            "size": len(response.content)
                        })
                    else:
                        logger.warning(f"Failed to download screenshot {url}: {response.status_code}")
                except Exception as e:
                    logger.warning(f"Error downloading screenshot {url}: {e}")
                    continue
        
        return {
            "app_id": app_id,
            "app_name": app.name,
            "screenshots": processed_screenshots,
            "total_available": len(screenshot_urls),
            "processed": len(processed_screenshots)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting app screenshots: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal server error while fetching app screenshots"
        )


@app.get("/health")
async def health_check() -> Dict[str, str]:
    """Health check endpoint for the app store service."""
    return {"status": "healthy", "service": "app-store"}