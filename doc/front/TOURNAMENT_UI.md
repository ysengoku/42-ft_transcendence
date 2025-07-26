# Tournament UI

This document outlines the user interface flow for tournament-related features, from creation and registration to participation and result viewing.

## Tournament Menu: `/tournament-menu`

The Tournament Menu serves as the central hub for all tournament activities.

### 👉 Creating a new tournament

Users can initiate the creation of a new tournament by clicking on a "Create Tournament" button. This action opens the Tournament Creation Form.

### 👉 Viewing tournaments

The main screen of the Tournament Menu displays a list of available tournaments.

#### Pending tournament

Clicking on a pending tournament in the list will open its Registration Form, allowing users to sign up for the tournament.

#### Ongoing and Finished tournament

For ongoing or finished tournaments, clicking on the tournament entry will display an Modal. This modal provides a quick summary and includes a direct link to a more Detailed Results Page (`/tournament-overview/:id`).

## Tournament lobby: `/tournament-room/:id`

The Tournament Lobby is exclusively accessible to participants of a specific tournament and provides real-time updates on its progress.

### 👉 Tournament Status updates

The lobby dynamically displays the current status of the tournament, which can include:
- **Pending**: The tournament is awaiting the required number of participants.
- **Tournament starting**: The tournament is about to begin, showing the brackets of the first round.
- **Round ongoing**: Matches in the current round are in progress. Displays the current status of the matches. 
- **Round finished**: All matches in the current round have concluded. Display the results
- **Round starting**: The next round is about to begin. Displays the brackets of the next round.

## Tournament overview: `/tournament-overview/:id`

The Tournament Overview page presents the results of ongoing or finished tournaments.

### 👉 Displaying results:

- Media wider than Break Point MD (768 by default): Results are displayed in a clear tree structure, making it easy to visualize the progression.
- Mobile (smaller than Break Point MD): For optimal viewing on smaller screens, results are presented in a table format.

## UI Flow during tournament

```mermaid
---
config:
  layout: dagre
  look: classic
  theme: redux
---
flowchart TD
 subgraph s1["Tournament Menu"]
        A(["Menu"])
        C(["Creation Form"])
        B(["Viewing Result"])
        D(["Registration Form"])
  end
 subgraph s2["Tournament lobby"]
        E(["Wait for tournament start"])
        F["Tournament Canceled"]
        G["Brackets for Round 1"]
        J["Qualified or Eliminated?"]
        K(["Wait for Other participants"])
        M["Elimination Message"]
        L["Round Results"]
        N["Next Round Brackets"]
        O(["Tournament Finished"])
  end
 subgraph s3["Game room"]
        H(["Match Play"])
        I["Match Results"]
  end
 subgraph s4["Tournament overview"]
        P["Tournament Final Result"]
  end
    A -- New tournament --> C
    A -- Pending tournament --> D
    A -- Ongoing or finished tournament --> B
    C --> E
    D --> E
    E -- Tournament Creator Cancels --> F
    E -- Required number of participants registered --> G
    G --> H
    H -- Match Concludes --> I
    I --> J
    J -- Qualified Participant --> K
    K -- All Matches in Round Finished --> L
    L --> N
    N --> H
    J -- Eliminated Participant --> M
    M --> P
    L -- Final Round Concluded --> O
    O --> P

    J@{ shape: text}
    N@{ shape: rect}
    P@{ shape: rect}
    style F stroke-width:2px,stroke-dasharray: 2
    style G stroke-width:2px,stroke-dasharray: 2
    style M stroke-width:2px,stroke-dasharray: 2
    style L stroke-width:2px,stroke-dasharray: 2
    style N stroke-width:2px,stroke-dasharray: 2
    style I stroke-width:2px,stroke-dasharray: 2
    style P stroke-width:2px,stroke-dasharray: 2
```
