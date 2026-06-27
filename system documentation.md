Moblie native app uses Layered architecture 

Presentation (React components)
    ↓
Application (hooks, state)
    ↓
Domain (services, pure functions)
    ↓
Infrastructure (Supabase client)


 System architecture diagrams

─────────────────────────────────────────┐
│           React Native (Expo)           │
│  ┌─────────────────────────────────┐   │
│  │  Map Screen (expo-maps)         │   │
│  │  - Display polygon zones        │   │
│  │  - Track user location          │   │-----> react components 
│  │  - "Request to Join" button     │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │  Services Layer                 │   │
│  │  - locationService.ts           │   │-> Domain(services,functions)
│  │  - zoneService.ts               │   │
│  │  - joinRequestService.ts        │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │  State Management (Zustand)     │   │
│  │  - useZoneStore.ts              │   │-----> Application(hook,state)
│  │  - useLocationStore.ts          │   │
│  └─────────────────────────────────┘   │
└─────────────────┬─────────────────────┘
                  │ HTTPS
┌─────────────────▼─────────────────────┐
│           Supabase (BaaS)             │
│  ┌─────────────────────────────────┐  │
│  │  PostgreSQL Database            │  │
│  │  - zones (polygon geometry)     │  │
│  │  - join_requests (status)       │  │
│  │  - users (auth)                 │  │
│  └─────────────────────────────────┘  │
│  ┌─────────────────────────────────┐  │
│  │  Row Level Security (RLS)       │  │
│  │  - Users read own requests      │  │
│  │  - Admins read all              │  │
│  └─────────────────────────────────┘  │
│  ┌─────────────────────────────────┐  │
│  │  Edge Functions / RPC           │  │
│  │  - check_zone (PostGIS check)   │  │
│  └─────────────────────────────────┘  │
└───────────────────────────────────────┘

## Business Logic Workflow: Neighborhood Join Request

The core business logic of the application revolves around accurately verifying if a user is physically present inside a specific neighborhood zone before approving their membership request. This workflow combines client-side speed with server-side security.

1. Pre-Flight & Data Loading
1. The app boots and authenticates the user via Supabase (`useAuthStore`).
2. The map screen loads the `ZoneMap` component.
3. `useZoneStore` requests the list of neighborhood polygons (GeoJSON) from Supabase. If the network drops, it falls back to hardcoded zones to maintain offline resilience.

2. Live GPS Tracking
1. The `useLocation` hook constantly monitors the user's GPS coordinates using `expo-location`.
2. As the user moves, `useZones` actively runs `turf.js` locally to check if the user's coordinates intersect with any of the downloaded neighborhood polygons.
3. **UX Impact:** If the user steps inside a zone, the "Request Review" button instantly turns green and says "Request to Join [Zone Name]" without any network delays.

 3. Join Request Execution
When the user taps the Join button, the `submitJoinRequest` service is triggered:
1. **Client Assertion:** The app records what zone `turf.js` believes the user is inside.
2. **Server Verification:** The app calls the Supabase RPC function `check_zone`.
3. **PostGIS Check:** The database uses `ST_Within` to mathematically verify the user's coordinates against the highly-accurate Polygon data stored securely on the server.

4. Status Determination
The system compares the Client Assertion vs the Server Verification to assign a strict status:
- `approved`: The server verifies the user is inside the zone. Auto-approved.
- `under_review`: The client says the user is inside, but the server says they are outside. This is flagged for an admin because it implies either GPS drift near a boundary, or the user is trying to spoof their client-side location.
- `pending`: Both the client and server agree the user is outside. An admin must manually review the request.

5. Resolution
The database records the request. The UI reads this state via `useZoneStore` and updates the Join Button to reflect the final status (e.g., "Request Approved!" or "🔍 Under Review").