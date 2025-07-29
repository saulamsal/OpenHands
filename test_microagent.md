# Microagent Testing

## Test Prompt

Let's test if the Expo microagent is working correctly with keyword injection.

**Test Input**: "expo create a todo app with authentication"

**Expected Behavior**:
1. The "expo" keyword should trigger the Expo microagent
2. The microagent should provide instructions to copy from templates instead of running `npx create-expo-app`
3. It should mention NativeWind, Expo Router, and MMKV
4. It should emphasize universal app development (iOS, Android, Web)

## Manual Test

You can test this by:

1. Starting OpenHands with the new microagent
2. Using the prompt: "expo create a todo app with authentication"
3. Verifying the response includes template copying instructions
4. Checking that it doesn't suggest running `npx` commands

## Expected Response Elements

The response should include:
- ✅ Template selection logic (default vs saas template)
- ✅ `cp -r templates/expo/saas ./TodoApp` instead of `npx create-expo-app`
- ✅ NativeWind styling instructions
- ✅ Expo Router navigation setup
- ✅ MMKV storage for auth tokens
- ✅ Universal app principles (works on all platforms)
- ✅ Authentication flow with Supabase

## Next Steps

Once testing confirms the microagent is working:
1. Implement backend keyword injection
2. Deploy templates to production
3. Monitor usage analytics
4. Expand to additional templates (health, marketplace, etc.)

This testing approach ensures the specialized microagent system works as designed before full implementation.