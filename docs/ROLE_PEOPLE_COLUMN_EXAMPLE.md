# Example: Roles List with People Column

This document shows a practical example of how the roles list people column feature works.

## Setup

Let's say you have a team with these roles and people:

### Role: Product Manager
```yaml
---
type: role
show: Product Manager
---
# Product Manager

This role is responsible for product strategy and roadmap.
```

### Role: Software Engineer
```yaml
---
type: role
show: Software Engineer
---
# Software Engineer

This role is responsible for implementing features.
```

### People with Roles

**Person 1: Alice Smith**
```yaml
---
type: person
show: Alice Smith
role: [[Product Manager]]
company: [[Acme Corp]]
---
```

**Person 2: Bob Johnson**
```yaml
---
type: person
show: Bob Johnson
role: [[Software Engineer]]
company: [[Acme Corp]]
---
```

**Person 3: Charlie Brown**
```yaml
---
type: person
show: Charlie Brown
role: [[Software Engineer]]
company: [[Acme Corp]]
---
```

**Person 4: Diana Prince**
```yaml
---
type: person
show: Diana Prince
role: [[Product Manager]]
company: [[Acme Corp]]
---
```

**Person 5: Edward Norton**
```yaml
---
type: person
show: Edward Norton
role: [[Software Engineer]]
company: [[Acme Corp]]
---
```

**Person 6: Fiona Apple**
```yaml
---
type: person
show: Fiona Apple
roles:  # Note: using plural "roles"
  - [[Software Engineer]]
company: [[Acme Corp]]
---
```

**Person 7: George Harris**
```yaml
---
type: person
show: George Harris
role: [[Software Engineer]]
company: [[Acme Corp]]
---
```

**Person 8: Hannah Montana**
```yaml
---
type: person
show: Hannah Montana
role: [[Software Engineer]]
company: [[Acme Corp]]
---
```

## Resulting Roles List

When you view the roles entity list, it will display:

```
┌─────────────────────┬──────────────────────────────────────────────────────────────────┐
│ Show                │ People                                                           │
├─────────────────────┼──────────────────────────────────────────────────────────────────┤
│ Product Manager     │ Alice Smith, Diana Prince                                        │
│ Software Engineer   │ Bob Johnson, Charlie Brown, Edward Norton, Fiona Apple, George… │
└─────────────────────┴──────────────────────────────────────────────────────────────────┘
```

### Notes:

1. **Alphabetical Order**: People are sorted alphabetically within each role
   - Product Manager: Alice (A) comes before Diana (D)
   - Software Engineer: Bob (B), Charlie (C), Edward (E), Fiona (F), George (G)...

2. **First 5 People**: Software Engineer role has 6 people (Bob, Charlie, Edward, Fiona, George, Hannah) but only shows the first 5 alphabetically (Bob through George). Hannah is not shown because she's 6th alphabetically.

3. **Clickable Links**: Each name is a clickable link that navigates to that person's note

4. **Comma Separation**: Names are separated by commas for easy reading

5. **Both `role` and `roles` Supported**: Fiona's note uses `roles:` (plural) and she still appears in the list correctly

## In Obsidian

In the actual Obsidian UI, the people column would render as:

**Product Manager**
- [Alice Smith] (clickable link), [Diana Prince] (clickable link)

**Software Engineer**
- [Bob Johnson] (clickable link), [Charlie Brown] (clickable link), [Edward Norton] (clickable link), [Fiona Apple] (clickable link), [George Harris] (clickable link)

Where each name in brackets is an actual clickable internal link to that person's note.

## Adding More People

If you add a new person:

```yaml
---
type: person
show: Aaron Anderson
role: [[Software Engineer]]
---
```

Aaron would appear FIRST in the Software Engineer list (alphabetically before Bob), and George Harris would be pushed out since we only show 5 people.

The new list would be:
- **Software Engineer**: Aaron Anderson, Bob Johnson, Charlie Brown, Edward Norton, Fiona Apple

## Viewing the Full List

To see ALL people in a role (not just the first 5), you can:
1. Click on the role name to open the role note
2. The role note's entity panel shows a "People" backlinks section with ALL people in that role

Or you can modify `MAX_LINKED_PEOPLE` in the code to show more than 5.
