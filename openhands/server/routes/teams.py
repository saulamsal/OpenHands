"""Team management routes for OpenHands.

This module provides team management endpoints similar to Laravel Jetstream,
allowing users to create teams, invite members, and manage permissions.
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from openhands.core.logger import openhands_logger as logger
from openhands.server.user_auth.database_user_auth import get_current_user_dependency
from openhands.server.auth.schemas import TeamCreate, TeamUpdate, TeamMemberInvite
from openhands.storage.database import Team, TeamMember, User, get_async_session
from openhands.storage.database.models import TeamRole
from pydantic import BaseModel, EmailStr


class TeamRead(BaseModel):
    """Schema for reading team data."""
    id: UUID
    name: str
    owner_id: UUID
    is_personal: bool
    created_at: str
    
    class Config:
        from_attributes = True


class TeamMemberRead(BaseModel):
    """Schema for reading team member data."""
    id: UUID
    user_id: UUID
    team_id: UUID
    role: str
    user_email: str
    user_name: str | None
    
    class Config:
        from_attributes = True


# Create the teams router
app = APIRouter(prefix="/api/teams", tags=["teams"])


@app.get("/", response_model=List[TeamRead])
async def get_user_teams(
    current_user: User = Depends(get_current_user_dependency),
    db: AsyncSession = Depends(get_async_session),
):
    """Get all teams the current user belongs to.
    
    This includes both owned teams and teams where the user is a member.
    """
    # Get teams owned by the user
    owned_teams_result = await db.execute(
        select(Team).where(Team.owner_id == current_user.id)
    )
    owned_teams = owned_teams_result.scalars().all()
    
    # Get teams where user is a member
    member_teams_result = await db.execute(
        select(Team)
        .join(TeamMember)
        .where(TeamMember.user_id == current_user.id)
        .options(selectinload(Team.members))
    )
    member_teams = member_teams_result.scalars().all()
    
    # Combine and deduplicate
    all_teams = list(owned_teams)
    for team in member_teams:
        if team not in all_teams:
            all_teams.append(team)
    
    return [
        TeamRead(
            id=team.id,
            name=team.name,
            owner_id=team.owner_id,
            is_personal=team.is_personal,
            created_at=team.created_at.isoformat(),
        )
        for team in all_teams
    ]


@app.post("/", response_model=TeamRead)
async def create_team(
    team_data: TeamCreate,
    current_user: User = Depends(get_current_user_dependency),
    db: AsyncSession = Depends(get_async_session),
):
    """Create a new team.
    
    The current user becomes the owner of the team.
    """
    team = Team(
        name=team_data.name,
        owner_id=current_user.id,
        is_personal=False,
    )
    db.add(team)
    await db.commit()
    await db.refresh(team)
    
    logger.info(f"User {current_user.id} created team {team.id}")
    
    return TeamRead(
        id=team.id,
        name=team.name,
        owner_id=team.owner_id,
        is_personal=team.is_personal,
        created_at=team.created_at.isoformat(),
    )


@app.get("/{team_id}", response_model=TeamRead)
async def get_team(
    team_id: UUID,
    current_user: User = Depends(get_current_user_dependency),
    db: AsyncSession = Depends(get_async_session),
):
    """Get a specific team by ID.
    
    User must be a member or owner of the team.
    """
    result = await db.execute(
        select(Team).where(Team.id == team_id)
    )
    team = result.scalar_one_or_none()
    
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found",
        )
    
    # Check if user has access to this team
    if team.owner_id != current_user.id:
        member_result = await db.execute(
            select(TeamMember).where(
                and_(
                    TeamMember.team_id == team_id,
                    TeamMember.user_id == current_user.id,
                )
            )
        )
        if not member_result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this team",
            )
    
    return TeamRead(
        id=team.id,
        name=team.name,
        owner_id=team.owner_id,
        is_personal=team.is_personal,
        created_at=team.created_at.isoformat(),
    )


@app.patch("/{team_id}", response_model=TeamRead)
async def update_team(
    team_id: UUID,
    team_data: TeamUpdate,
    current_user: User = Depends(get_current_user_dependency),
    db: AsyncSession = Depends(get_async_session),
):
    """Update a team's information.
    
    Only team owners and admins can update team details.
    """
    result = await db.execute(
        select(Team).where(Team.id == team_id)
    )
    team = result.scalar_one_or_none()
    
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found",
        )
    
    # Check if user is owner or admin
    is_authorized = team.owner_id == current_user.id
    if not is_authorized:
        member_result = await db.execute(
            select(TeamMember).where(
                and_(
                    TeamMember.team_id == team_id,
                    TeamMember.user_id == current_user.id,
                    TeamMember.role.in_([TeamRole.OWNER.value, TeamRole.ADMIN.value]),
                )
            )
        )
        is_authorized = member_result.scalar_one_or_none() is not None
    
    if not is_authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only team owners and admins can update team details",
        )
    
    # Update team
    if team_data.name:
        team.name = team_data.name
    
    await db.commit()
    await db.refresh(team)
    
    return TeamRead(
        id=team.id,
        name=team.name,
        owner_id=team.owner_id,
        is_personal=team.is_personal,
        created_at=team.created_at.isoformat(),
    )


@app.delete("/{team_id}")
async def delete_team(
    team_id: UUID,
    current_user: User = Depends(get_current_user_dependency),
    db: AsyncSession = Depends(get_async_session),
):
    """Delete a team.
    
    Only team owners can delete teams. Personal teams cannot be deleted.
    """
    result = await db.execute(
        select(Team).where(Team.id == team_id)
    )
    team = result.scalar_one_or_none()
    
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found",
        )
    
    if team.is_personal:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Personal teams cannot be deleted",
        )
    
    if team.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only team owners can delete teams",
        )
    
    await db.delete(team)
    await db.commit()
    
    logger.info(f"User {current_user.id} deleted team {team_id}")
    
    return {"message": "Team deleted successfully"}


@app.get("/{team_id}/members", response_model=List[TeamMemberRead])
async def get_team_members(
    team_id: UUID,
    current_user: User = Depends(get_current_user_dependency),
    db: AsyncSession = Depends(get_async_session),
):
    """Get all members of a team.
    
    User must be a member or owner of the team.
    """
    # Verify team exists and user has access
    result = await db.execute(
        select(Team).where(Team.id == team_id)
    )
    team = result.scalar_one_or_none()
    
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found",
        )
    
    # Check access
    has_access = team.owner_id == current_user.id
    if not has_access:
        member_result = await db.execute(
            select(TeamMember).where(
                and_(
                    TeamMember.team_id == team_id,
                    TeamMember.user_id == current_user.id,
                )
            )
        )
        has_access = member_result.scalar_one_or_none() is not None
    
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this team",
        )
    
    # Get all members
    members_result = await db.execute(
        select(TeamMember, User)
        .join(User, TeamMember.user_id == User.id)
        .where(TeamMember.team_id == team_id)
    )
    members = members_result.all()
    
    # Include owner as a member
    owner_result = await db.execute(
        select(User).where(User.id == team.owner_id)
    )
    owner = owner_result.scalar_one()
    
    result = [
        TeamMemberRead(
            id=UUID("00000000-0000-0000-0000-000000000000"),  # Placeholder for owner
            user_id=owner.id,
            team_id=team_id,
            role=TeamRole.OWNER.value,
            user_email=owner.email,
            user_name=owner.name,
        )
    ]
    
    for member, user in members:
        result.append(
            TeamMemberRead(
                id=member.id,
                user_id=user.id,
                team_id=team_id,
                role=member.role,
                user_email=user.email,
                user_name=user.name,
            )
        )
    
    return result


@app.post("/{team_id}/members")
async def invite_team_member(
    team_id: UUID,
    invite_data: TeamMemberInvite,
    current_user: User = Depends(get_current_user_dependency),
    db: AsyncSession = Depends(get_async_session),
):
    """Invite a user to join the team.
    
    Only team owners and admins can invite new members.
    """
    # Verify team exists
    team_result = await db.execute(
        select(Team).where(Team.id == team_id)
    )
    team = team_result.scalar_one_or_none()
    
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found",
        )
    
    # Check if user is authorized
    is_authorized = team.owner_id == current_user.id
    if not is_authorized:
        member_result = await db.execute(
            select(TeamMember).where(
                and_(
                    TeamMember.team_id == team_id,
                    TeamMember.user_id == current_user.id,
                    TeamMember.role.in_([TeamRole.OWNER.value, TeamRole.ADMIN.value]),
                )
            )
        )
        is_authorized = member_result.scalar_one_or_none() is not None
    
    if not is_authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only team owners and admins can invite members",
        )
    
    # Find user by email
    user_result = await db.execute(
        select(User).where(User.email == invite_data.email)
    )
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found with that email",
        )
    
    # Check if user is already a member
    existing_member = await db.execute(
        select(TeamMember).where(
            and_(
                TeamMember.team_id == team_id,
                TeamMember.user_id == user.id,
            )
        )
    )
    if existing_member.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already a member of this team",
        )
    
    # Add user to team
    member = TeamMember(
        team_id=team_id,
        user_id=user.id,
        role=invite_data.role,
    )
    db.add(member)
    await db.commit()
    
    logger.info(f"User {current_user.id} invited {user.id} to team {team_id}")
    
    return {"message": "User invited to team successfully"}


@app.delete("/{team_id}/members/{user_id}")
async def remove_team_member(
    team_id: UUID,
    user_id: UUID,
    current_user: User = Depends(get_current_user_dependency),
    db: AsyncSession = Depends(get_async_session),
):
    """Remove a member from the team.
    
    Only team owners and admins can remove members.
    Users can remove themselves from teams they don't own.
    """
    # Verify team exists
    team_result = await db.execute(
        select(Team).where(Team.id == team_id)
    )
    team = team_result.scalar_one_or_none()
    
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found",
        )
    
    # Can't remove the owner
    if user_id == team.owner_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove the team owner",
        )
    
    # Check if user is authorized
    is_self_removal = user_id == current_user.id
    is_authorized = is_self_removal or team.owner_id == current_user.id
    
    if not is_authorized:
        member_result = await db.execute(
            select(TeamMember).where(
                and_(
                    TeamMember.team_id == team_id,
                    TeamMember.user_id == current_user.id,
                    TeamMember.role.in_([TeamRole.OWNER.value, TeamRole.ADMIN.value]),
                )
            )
        )
        is_authorized = member_result.scalar_one_or_none() is not None
    
    if not is_authorized:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to remove this member",
        )
    
    # Find and remove member
    member_result = await db.execute(
        select(TeamMember).where(
            and_(
                TeamMember.team_id == team_id,
                TeamMember.user_id == user_id,
            )
        )
    )
    member = member_result.scalar_one_or_none()
    
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User is not a member of this team",
        )
    
    await db.delete(member)
    await db.commit()
    
    logger.info(f"User {current_user.id} removed {user_id} from team {team_id}")
    
    return {"message": "Member removed from team successfully"}