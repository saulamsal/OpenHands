"""Enhanced billing routes for subscription system."""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import JSONResponse
from typing import Optional
import os

from openhands.core.logger import openhands_logger as logger
from openhands.server.auth.dependencies import require_auth
from openhands.server.dependencies import get_dependencies
from openhands.storage.database.models import User
from openhands.storage.database.models.subscription_models import Subscription
from openhands.storage.database.session import get_async_session_context
from openhands.storage.data_models.subscription import (
    CreateSubscriptionRequest, UpdateSubscriptionRequest, 
    CancelSubscriptionRequest, CreateTopupRequest
)
from openhands.server.services.token_service import TokenService, TOPUP_TOKEN_PRICE
from openhands.server.services.subscription_service import SubscriptionService, ProrationMode
from openhands.server.services.stripe_service import StripeService
from openhands.server.services.rate_limiter import RateLimiter
from sqlalchemy import select

app = APIRouter(prefix='/api', dependencies=get_dependencies())

# Environment configuration
STRIPE_SUCCESS_URL = os.getenv('STRIPE_SUCCESS_URL', '{FRONTEND_URL}/billing?checkout=success')
STRIPE_CANCEL_URL = os.getenv('STRIPE_CANCEL_URL', '{FRONTEND_URL}/billing?checkout=cancel')


async def get_stripe_service() -> StripeService:
    """Get Stripe service instance."""
    return StripeService()


async def get_token_service():
    """Get token service instance."""
    async with get_async_session_context() as db:
        yield TokenService(db)


async def get_subscription_service():
    """Get subscription service instance."""
    async with get_async_session_context() as db:
        stripe_service = await get_stripe_service()
        token_service = TokenService(db)
        yield SubscriptionService(db, stripe_service, token_service)


async def get_rate_limiter():
    """Get rate limiter instance."""
    async with get_async_session_context() as db:
        yield RateLimiter(db)


async def ensure_stripe_customer(user_id: str, team_id: Optional[str] = None) -> str:
    """Ensure user has a Stripe customer ID."""
    async with get_async_session_context() as db:
        result = await db.execute(
            select(User).filter(User.id == user_id)
        )
        user = result.scalar_one()
        
        if user.stripe_customer_id:
            return user.stripe_customer_id
        
        stripe_service = await get_stripe_service()
        customer = await stripe_service.create_customer(
            email=user.email,
            name=user.name,
            metadata={'user_id': str(user_id)}
        )
        
        user.stripe_customer_id = customer.id
        await db.commit()
        
        return customer.id


async def get_plan(plan_id: str):
    """Get subscription plan by ID."""
    from openhands.storage.database.models.subscription_models import SubscriptionPlan
    
    async with get_async_session_context() as db:
        result = await db.execute(
            select(SubscriptionPlan).filter(SubscriptionPlan.id == plan_id)
        )
        plan = result.scalar_one_or_none()
        if not plan:
            raise HTTPException(status_code=404, detail="Plan not found")
        return plan


async def get_user_subscription(user_id: str) -> Optional[Subscription]:
    """Get user's active subscription."""
    async with get_async_session_context() as db:
        result = await db.execute(
            select(Subscription)
            .filter(
                Subscription.user_id == user_id,
                Subscription.status.in_(['active', 'trialing'])
            )
        )
        return result.scalar_one_or_none()


@app.post('/billing/create-subscription-checkout')
async def create_subscription_checkout(
    request: CreateSubscriptionRequest,
    user_id: str = Depends(require_auth),
    stripe_service: StripeService = Depends(get_stripe_service)
):
    """Create checkout session for subscription"""
    try:
        # Get plan
        plan = await get_plan(request.plan_id)
        
        # Get or create customer
        customer_id = await ensure_stripe_customer(user_id, request.team_id)
        
        # Create checkout session
        session = await stripe_service.create_checkout_session(
            customer_id=customer_id,
            price_id=plan.stripe_price_id,
            mode='subscription',
            success_url=STRIPE_SUCCESS_URL.format(FRONTEND_URL=os.getenv('FRONTEND_URL')),
            cancel_url=STRIPE_CANCEL_URL.format(FRONTEND_URL=os.getenv('FRONTEND_URL')),
            metadata={
                'user_id': user_id,
                'team_id': request.team_id or '',
                'plan_id': request.plan_id
            }
        )
        
        return JSONResponse(
            status_code=200,
            content={
                'checkout_url': session.url,
                'session_id': session.id
            }
        )
    except Exception as e:
        logger.error(f"Error creating subscription checkout: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post('/billing/create-topup-checkout')
async def create_topup_checkout(
    request: CreateTopupRequest,
    user_id: str = Depends(require_auth),
    stripe_service: StripeService = Depends(get_stripe_service)
):
    """Create checkout session for token top-up"""
    # Validate amount
    if request.amount < 10 or request.amount > 10000:
        raise HTTPException(
            status_code=400,
            detail="Amount must be between $10 and $10,000"
        )
    
    # Calculate tokens
    tokens = int(request.amount / TOPUP_TOKEN_PRICE / 1000)  # Convert to per-token price
    
    # Create line items
    line_items = [{
        'price_data': {
            'currency': 'usd',
            'product_data': {
                'name': 'OpenHands Token Top-up',
                'description': f'{tokens:,} tokens'
            },
            'unit_amount': request.amount * 100,  # Convert to cents
        },
        'quantity': 1,
    }]
    
    # Get or create customer
    customer_id = await ensure_stripe_customer(user_id)
    
    # Create checkout session
    session = await stripe_service.create_checkout_session(
        customer_id=customer_id,
        mode='payment',
        line_items=line_items,
        success_url=STRIPE_SUCCESS_URL.format(FRONTEND_URL=os.getenv('FRONTEND_URL')),
        cancel_url=STRIPE_CANCEL_URL.format(FRONTEND_URL=os.getenv('FRONTEND_URL')),
        metadata={
            'user_id': user_id,
            'type': 'topup',
            'tokens': str(tokens),
            'amount': str(request.amount)
        }
    )
    
    return JSONResponse(
        status_code=200,
        content={
            'checkout_url': session.url,
            'session_id': session.id,
            'tokens': tokens
        }
    )


@app.get('/billing/subscription')
async def get_subscription(
    user_id: str = Depends(require_auth),
    subscription_service: SubscriptionService = Depends(get_subscription_service)
):
    """Get current subscription details"""
    subscription = await subscription_service.get_user_subscription(user_id)
    
    if not subscription:
        return JSONResponse(
            status_code=200,
            content={'subscription': None}
        )
    
    return JSONResponse(
        status_code=200,
        content={
            'subscription': {
                'id': str(subscription.id),
                'plan_name': subscription.plan.display_name,
                'status': subscription.status,
                'current_period_start': subscription.current_period_start.isoformat(),
                'current_period_end': subscription.current_period_end.isoformat(),
                'cancel_at_period_end': subscription.cancel_at_period_end,
                'tokens_per_month': subscription.plan.tokens_per_month
            }
        }
    )


@app.post('/billing/cancel-subscription')
async def cancel_subscription(
    request: CancelSubscriptionRequest,
    user_id: str = Depends(require_auth),
    subscription_service: SubscriptionService = Depends(get_subscription_service)
):
    """Cancel current subscription"""
    result = await subscription_service.cancel_subscription(
        user_id=user_id,
        immediate=request.immediate
    )
    
    return JSONResponse(
        status_code=200,
        content=result
    )


@app.post('/billing/update-subscription')
async def update_subscription(
    request: UpdateSubscriptionRequest,
    user_id: str = Depends(require_auth),
    subscription_service: SubscriptionService = Depends(get_subscription_service)
):
    """Update subscription plan"""
    # Get current subscription
    subscription = await subscription_service.get_user_subscription(user_id)
    if not subscription:
        raise HTTPException(status_code=404, detail="No active subscription found")
    
    # Map string to enum
    proration_mode_map = {
        'immediate_credit': ProrationMode.IMMEDIATE_CREDIT,
        'next_cycle': ProrationMode.NEXT_CYCLE,
        'no_proration': ProrationMode.NO_PRORATION
    }
    proration_mode = proration_mode_map.get(request.proration_mode, ProrationMode.IMMEDIATE_CREDIT)
    
    result = await subscription_service.update_subscription(
        subscription_id=str(subscription.id),
        new_plan_id=request.new_plan_id,
        proration_mode=proration_mode
    )
    
    return JSONResponse(
        status_code=200,
        content=result
    )


@app.get('/billing/token-balance')
async def get_token_balance(
    user_id: str = Depends(require_auth),
    token_service: TokenService = Depends(get_token_service)
):
    """Get current token balance"""
    balance = await token_service.get_balance(user_id)
    return JSONResponse(
        status_code=200,
        content=balance
    )


@app.get('/billing/usage-history')
async def get_usage_history(
    user_id: str = Depends(require_auth),
    token_service: TokenService = Depends(get_token_service),
    limit: int = 100,
    offset: int = 0
):
    """Get token usage history with cost breakdown"""
    history = await token_service.get_usage_history(
        user_id=user_id,
        limit=limit,
        offset=offset
    )
    
    return JSONResponse(
        status_code=200,
        content={
            'usage': history,
            'total_count': len(history)
        }
    )


@app.post('/billing/manage-portal')
async def create_manage_portal_session(
    user_id: str = Depends(require_auth),
    stripe_service: StripeService = Depends(get_stripe_service)
):
    """Create Stripe customer portal session"""
    async with get_async_session_context() as db:
        result = await db.execute(
            select(User).filter(User.id == user_id)
        )
        user = result.scalar_one()
        
        if not user.stripe_customer_id:
            raise HTTPException(
                status_code=400,
                detail="No billing account found"
            )
    
    session = await stripe_service.create_portal_session(
        customer_id=user.stripe_customer_id,
        return_url=f"{os.getenv('FRONTEND_URL')}/billing"
    )
    
    return JSONResponse(
        status_code=200,
        content={
            'portal_url': session.url
        }
    )


@app.get('/billing/plans')
async def get_available_plans(
    plan_type: str = 'individual',
    billing_period: str = 'monthly',
    subscription_service: SubscriptionService = Depends(get_subscription_service)
):
    """Get available subscription plans"""
    plans = await subscription_service.get_available_plans(
        plan_type=plan_type,
        billing_period=billing_period
    )
    
    return JSONResponse(
        status_code=200,
        content={
            'plans': [
                {
                    'id': str(plan.id),
                    'name': plan.name,
                    'display_name': plan.display_name,
                    'price_cents': plan.price_cents,
                    'tokens_per_month': plan.tokens_per_month,
                    'features': plan.features
                }
                for plan in plans
            ]
        }
    )


@app.get('/billing/rate-limit-status')
async def get_rate_limit_status(
    user_id: str = Depends(require_auth),
    rate_limiter: RateLimiter = Depends(get_rate_limiter)
):
    """Get current rate limit status for free tier user"""
    limits = await rate_limiter.get_user_limits(user_id)
    
    return JSONResponse(
        status_code=200,
        content=limits
    )


# Rate limiting middleware for free tier
from starlette.middleware.base import BaseHTTPMiddleware

class RateLimitMiddleware(BaseHTTPMiddleware):
    """Apply rate limiting to free tier users"""
    
    async def dispatch(self, request: Request, call_next):
        # Only apply to conversation creation endpoints
        if request.url.path.startswith("/api/conversation") and request.method == "POST":
            # Get user from auth
            user_id = getattr(request.state, 'user_id', None)
            
            if user_id:
                # Check if user is on free tier
                subscription = await get_user_subscription(user_id)
                
                if not subscription:  # Free tier
                    async with get_async_session_context() as db:
                        rate_limiter = RateLimiter(db)
                        ip_address = request.client.host
                        user_agent = request.headers.get('user-agent', '')
                        
                        allowed, remaining, reset_time = await rate_limiter.check_rate_limit(
                            user_id=user_id,
                            ip_address=ip_address,
                            user_agent=user_agent
                        )
                        
                        if not allowed:
                            return JSONResponse(
                                status_code=429,
                                content={
                                    'error': 'Rate limit exceeded',
                                    'message': 'Free tier is limited to 2 prompts per day',
                                    'reset_at': reset_time.isoformat(),
                                    'upgrade_url': '/pricing'
                                },
                                headers={
                                    'X-RateLimit-Limit': '2',
                                    'X-RateLimit-Remaining': '0',
                                    'X-RateLimit-Reset': str(int(reset_time.timestamp()))
                                }
                            )
                        
                        # Add rate limit headers
                        response = await call_next(request)
                        response.headers['X-RateLimit-Limit'] = '2'
                        response.headers['X-RateLimit-Remaining'] = str(remaining)
                        response.headers['X-RateLimit-Reset'] = str(int(reset_time.timestamp()))
                        return response
        
        return await call_next(request)