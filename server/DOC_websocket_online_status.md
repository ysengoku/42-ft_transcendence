WebSocket Configuration for User Online Status with JWT Authentication

custom JWT middleware (JWTAuthMiddleware)
Origin validation based on allowed hosts (AllowedHostsOriginValidator)
WebSocket URL routing for the combined patterns from chat and users
The is_authenticated check will work directly thanks to this configuration. 

Here's the flow:

When a WebSocket connection arrives, it first passes through your JWTAuthMiddleware
This middleware extracts and verifies the JWT token from cookies/headers and sets scope["user"]
In your consumer, you can access self.user (which comes from scope["user"])
You can then check self.user.is_authenticated to determine if the user is authenticated
This approach is elegant because it:

Separates authentication (via JWT) from online status management (via Redis)
Uses Django's standard authentication mechanisms
Applies the Single Responsibility Principle
With everything properly configured, users should appear in the online users list when they establish a WebSocket connection.
