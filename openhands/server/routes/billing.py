"""Billing routes for OpenHands SaaS."""

from typing import Optional
import os
import stripe

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from openhands.core.logger import openhands_logger as logger
from openhands.server.auth.dependencies import require_auth
from openhands.server.dependencies import get_dependencies
from openhands.storage.database.models import User
from openhands.storage.database.session import get_async_session_context
from sqlalchemy import select
from openhands.server.user_auth import get_user_settings, get_user_settings_store
from openhands.storage.data_models.settings import Settings
from openhands.storage.settings.settings_store import SettingsStore

# Initialize Stripe with API key from environment
stripe.api_key = os.getenv('STRIPE_SECRET_KEY', '')

app = APIRouter(prefix='/api', dependencies=get_dependencies())


class PaymentSessionRequest(BaseModel):
    amount: Optional[int] = None  # Amount in cents
    return_url: Optional[str] = None


@app.post(
    '/billing/create-customer-setup-session',
    response_model=None,
    responses={
        200: {'description': 'Billing session created', 'model': dict},
        400: {'description': 'Bad request', 'model': dict},
        500: {'description': 'Internal server error', 'model': dict},
    },
)
async def create_customer_setup_session(
    user_id: Optional[str] = Depends(require_auth),
) -> JSONResponse:
    """
    Create a Stripe customer portal session for billing setup.
    """
    logger.info(f'Billing setup session requested by user {user_id}')
    
    if not stripe.api_key:
        logger.error('Stripe API key not configured')
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                'error': 'Payment system not configured',
                'message': 'Please contact support'
            }
        )
    
    try:
        # Get user email from database
        async with get_async_session_context() as db_session:
            result = await db_session.execute(
                select(User).filter(User.id == user_id)
            )
            user = result.scalar_one_or_none()
            
            if not user:
                return JSONResponse(
                    status_code=status.HTTP_404_NOT_FOUND,
                    content={'error': 'User not found'}
                )
        
        # Check if customer already exists in Stripe
        customers = stripe.Customer.list(email=user.email, limit=1)
        
        if customers.data:
            customer = customers.data[0]
            logger.info(f'Found existing Stripe customer: {customer.id}')
        else:
            # Create new customer in Stripe
            customer = stripe.Customer.create(
                email=user.email,
                metadata={'user_id': str(user_id)}
            )
            logger.info(f'Created new Stripe customer: {customer.id}')
        
        # Create a setup session for adding payment methods
        session = stripe.checkout.Session.create(
            customer=customer.id,
            mode='setup',
            payment_method_types=['card'],
            success_url=os.getenv('FRONTEND_URL', 'http://localhost:3001') + '/settings?billing=success',
            cancel_url=os.getenv('FRONTEND_URL', 'http://localhost:3001') + '/settings?billing=cancelled',
            metadata={'user_id': str(user_id)}
        )
        
        logger.info(f'Created Stripe setup session: {session.id}')
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                'redirect_url': session.url,
                'session_id': session.id
            }
        )
        
    except stripe.error.StripeError as e:
        logger.error(f'Stripe error: {str(e)}')
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                'error': 'Payment processing error',
                'message': str(e)
            }
        )
    except Exception as e:
        logger.error(f'Unexpected error creating billing session: {str(e)}')
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                'error': 'Internal server error',
                'message': 'Failed to create billing session'
            }
        )


@app.get(
    '/billing/balance',
    response_model=None,
    responses={
        200: {'description': 'Balance retrieved', 'model': dict},
    },
)
async def get_balance(
    user_id: Optional[str] = Depends(require_auth),
) -> JSONResponse:
    """
    Get user balance/credits.
    
    For now, returns a default balance. In production, this would
    check the user's subscription status and credit balance.
    """
    # TODO: Implement proper balance tracking
    # This would typically check:
    # 1. User's active subscription
    # 2. Remaining credits
    # 3. Usage limits
    
    return JSONResponse(
        status_code=status.HTTP_200_OK,
        content={
            'balance': 50.00,  # $50 in credits for new users
            'currency': 'USD',
            'subscription_active': False,
            'credits_remaining': 50.00
        }
    )


@app.post(
    '/billing/create-checkout-session',
    response_model=None,
    responses={
        200: {'description': 'Checkout session created', 'model': dict},
        400: {'description': 'Bad request', 'model': dict},
        500: {'description': 'Internal server error', 'model': dict},
    },
)
async def create_checkout_session(
    request: PaymentSessionRequest,
    user_id: Optional[str] = Depends(require_auth),
) -> JSONResponse:
    """
    Create a Stripe checkout session for purchasing credits or subscriptions.
    """
    logger.info(f'Checkout session requested by user {user_id} for amount: {request.amount}')
    
    if not stripe.api_key:
        logger.error('Stripe API key not configured')
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                'error': 'Payment system not configured',
                'message': 'Please contact support'
            }
        )
    
    try:
        # Get user email from database
        async with get_async_session_context() as db_session:
            result = await db_session.execute(
                select(User).filter(User.id == user_id)
            )
            user = result.scalar_one_or_none()
            
            if not user:
                return JSONResponse(
                    status_code=status.HTTP_404_NOT_FOUND,
                    content={'error': 'User not found'}
                )
        
        # Check if customer already exists in Stripe
        customers = stripe.Customer.list(email=user.email, limit=1)
        
        if customers.data:
            customer = customers.data[0]
        else:
            # Create new customer in Stripe
            customer = stripe.Customer.create(
                email=user.email,
                metadata={'user_id': str(user_id)}
            )
        
        # Create line items based on the amount
        line_items = [{
            'price_data': {
                'currency': 'usd',
                'product_data': {
                    'name': 'OpenHands Credits',
                    'description': f'${request.amount / 100:.2f} in OpenHands credits'
                },
                'unit_amount': request.amount,  # Amount in cents
            },
            'quantity': 1,
        }]
        
        # Create checkout session
        session = stripe.checkout.Session.create(
            customer=customer.id,
            payment_method_types=['card'],
            line_items=line_items,
            mode='payment',
            success_url=request.return_url or (os.getenv('FRONTEND_URL', 'http://localhost:3001') + '/settings?payment=success'),
            cancel_url=os.getenv('FRONTEND_URL', 'http://localhost:3001') + '/settings?payment=cancelled',
            metadata={
                'user_id': str(user_id),
                'credit_amount': str(request.amount / 100)  # Store as dollars
            }
        )
        
        logger.info(f'Created Stripe checkout session: {session.id}')
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                'redirect_url': session.url,
                'session_id': session.id
            }
        )
        
    except stripe.error.StripeError as e:
        logger.error(f'Stripe error: {str(e)}')
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                'error': 'Payment processing error',
                'message': str(e)
            }
        )
    except Exception as e:
        logger.error(f'Unexpected error creating checkout session: {str(e)}')
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                'error': 'Internal server error',
                'message': 'Failed to create checkout session'
            }
        )


@app.post(
    '/billing/complete-setup',
    response_model=None,
    responses={
        200: {'description': 'Billing setup completed', 'model': dict},
        500: {'description': 'Internal server error', 'model': dict},
    },
)
async def complete_billing_setup(
    user_id: Optional[str] = Depends(require_auth),
    settings_store: SettingsStore = Depends(get_user_settings_store),
    settings: Settings = Depends(get_user_settings),
) -> JSONResponse:
    """
    Mark billing setup as complete for the user.
    """
    logger.info(f'Marking billing setup complete for user {user_id}')
    
    try:
        # Update user settings to mark billing as complete
        if settings:
            settings.has_completed_billing_setup = True
            await settings_store.store(settings)
        else:
            # Create new settings with billing marked as complete
            new_settings = Settings(has_completed_billing_setup=True)
            await settings_store.store(new_settings)
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                'status': 'success',
                'message': 'Billing setup completed'
            }
        )
        
    except Exception as e:
        logger.error(f'Error completing billing setup: {str(e)}')
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                'error': 'Failed to update billing status',
                'message': str(e)
            }
        )