# REST API

Base URL: same origin as the site (`http://localhost:3000` locally). All bodies are JSON. OpenAPI/Swagger is **not** provided; this document is the reference.

## Conventions
- **Auth:** `POST /api/auth/login|register` set an httpOnly cookie `hk_session` (JWT, 7 days). Send it on every request (browsers do automatically; scripts must replay the cookie).
  Endpoints marked 🔒 return **401** without a valid session.
- **Success:** `{ "data": … }` (201 for creations).
- **Error:** `{ "error": { "code": "VALIDATION_ERROR", "message": "…", "details": [{ "path": "amount", "message": "…" }] } }`

| Status | code | When |
|---|---|---|
| 400 | `BAD_REQUEST` / `VALIDATION_ERROR` | malformed input, split doesn't add up, non-member in split, bad id |
| 401 | `UNAUTHORIZED` / `INVALID_CREDENTIALS` | no/invalid session, wrong login |
| 403 | `FORBIDDEN` | not allowed (e.g. non-owner deleting group, cross-origin write) |
| 404 | `NOT_FOUND` | missing, **or** you're not a member of the group (deliberately indistinguishable) |
| 409 | `CONFLICT` | duplicate username/email/request/friendship |
| 500 | `INTERNAL` | unexpected; details only in server logs |

- **Money:** requests send **rupees as a string/number with ≤ 2 decimals** (`"1500"`, `"19.99"`). Responses return **integer paise** (`150000` = ₹1,500.00).
- **Dates:** `YYYY-MM-DD`; months `YYYY-MM`.
- **Writes** from a different Origin are rejected (CSRF defence).

## Authentication
| Method & URL | Body | Response |
|---|---|---|
| `POST /api/auth/register` | `{ username, email, displayName, password }` (username 3-20 `a-z0-9_`, password 8-72) | 201 `{ user:{ id, username, displayName, theme, email, createdAt } }` + cookie. 409 if taken |
| `POST /api/auth/login` | `{ identifier (username or email), password }` | `{ user }` + cookie. 401 on failure |
| `POST /api/auth/logout` | - | `{ loggedOut:true }`, clears cookie |
| `GET /api/auth/me` 🔒 | - | `{ user }` |
| `GET /api/health` | - | `{ status:"ok" }` (also checks the DB) |

## Users & friends 🔒
| Method & URL | Body / query | Response |
|---|---|---|
| `GET /api/users/search?q=ali` | `q` ≥ 2 chars (username prefix) | `{ users:[{ id, username, displayName, relation: NONE\|FRIEND\|REQUEST_SENT\|REQUEST_RECEIVED }] }` |
| `GET /api/users/{username}` | - | `{ user:{ id, username, displayName, isSelf, friendStatus } }` |
| `GET /api/friends` | - | `{ friends:[…+friendshipId], incoming:[…], outgoing:[…] }` |
| `POST /api/friends/requests` | `{ username }` | 201 `{ status: PENDING\|ACCEPTED, friendshipId }` (if they'd already asked you → auto-accepts). 404 unknown, 400 self, 409 duplicate |
| `POST /api/friends/requests/{id}/accept` | - | `{ accepted:true }` (403 if you sent it) |
| `POST /api/friends/requests/{id}/reject` | - | `{ rejected:true }` |
| `DELETE /api/friends/{friendshipId}` | - | `{ removed:true }` (remove friend / cancel sent request) |

## Groups 🔒
| Method & URL | Body | Response |
|---|---|---|
| `GET /api/groups` | - | `{ groups:[{ id, name, description, memberCount, … }] }` |
| `POST /api/groups` | `{ name, description? }` | 201 `{ group }` (you become OWNER) |
| `GET /api/groups/{id}` | - | `{ group:{ …, myRole, members:[{ id, username, displayName, role }] } }` |
| `PATCH /api/groups/{id}` | `{ name, description? }` | `{ group }` - owner only |
| `DELETE /api/groups/{id}` | - | `{ deleted:true }` - owner only; removes all its expenses/settlements |
| `POST /api/groups/{id}/members` | `{ userId }` | 201 `{ group }`. Must be **your friend** (403 otherwise) |
| `DELETE /api/groups/{id}/members/{userId}` | - | `{ removed:true }`. Owner removes anyone; anyone can leave. 400 if balance ≠ 0 or target is owner |

## Expenses & splits 🔒
`POST/PUT` body:
```json
{ "amount": "1500", "description": "Dinner", "categoryId": "uuid|null", "date": "2026-10-01",
  "paidBy": "userId", "notes": "optional",
  "split": { "type": "EQUAL", "participants": ["u1","u2","u3"] } }
```
Other `split` shapes: `{ "type":"EXACT", "amounts": { "u1":"700","u2":"500","u3":"300" } }` ·
`{ "type":"PERCENT", "percentages": { "u1":"50","u2":"30","u3":"20" } }` · `{ "type":"SHARES", "shares": { "u1":2,"u2":1,"u3":1 } }`.

| Method & URL | Response |
|---|---|
| `GET /api/groups/{id}/expenses` | `{ expenses:[{ id, description, amount, category, date, notes, splitType, paidBy:{id,name,username}, createdBy, splits:[{ userId, name, username, owed }] }] }` |
| `POST /api/groups/{id}/expenses` | 201 `{ expense }`. 400: amounts ≠ total, percent ≠ 100, bad shares, payer/participant not a member |
| `GET /api/expenses/{id}` | `{ expense }` (members only) |
| `PUT /api/expenses/{id}` | `{ expense }` - creator, payer or group owner only (403). Splits are replaced atomically; balances follow automatically |
| `DELETE /api/expenses/{id}` | `{ deleted:true }` - same authorization |

Split rows (`expense_splits`) are managed only through these endpoints so they can never disagree with the expense total.

## Direct expenses & friend balances (no group) 🔒
Use the same expense body as above. `POST /api/expenses` creates an expense **without a group**:

| Method & URL | Body | Response |
|---|---|---|
| `POST /api/expenses` | expense body (`paidBy`, `split` …) | 201 `{ expense }` with `groupId: null`. Rules: you must be involved (you paid or share it), at least one other person, and every other person must be **your friend** (403). Edit/read/delete use the same `/api/expenses/{id}` endpoints (involved users can read; creator or payer can edit/delete) |
| `GET /api/friends/balances` | - | `{ balances:[{ userId, username, name, net }] }` - non-zero only; `net > 0` = they owe you |
| `GET /api/friends/ledger/{userId}` | - | `{ friend, net, expenses:[…], settlements:[…] }` for the two of you. Works for friends, or anyone you still have a balance/history with (unfriending never strands money). 404 otherwise |
| `POST /api/friends/settlements` | `{ fromUser, toUser, amount, note? }` (you must be one of them) | 201. Recorded with no group; shows in `/api/settlements` as "Between friends" |

A *personal* (no-split) expense is just `POST /api/personal-transactions`.

`GET /api/balances` now also returns `friends:[{ userId, name, username, net }]`, and `owe` / `owed` / `net` include direct friend balances.

## Balances & settlements 🔒
| Method & URL | Body | Response |
|---|---|---|
| `GET /api/balances` | - | `{ owe, owed, net, groups:[{ groupId, name, net }] }` (paise; `net>0` = you're owed) |
| `GET /api/groups/{id}/balances` | - | `{ members:[{ id, name, username, net }], pairwise:[{ from, to, amount }], suggestions:[{ from, to, amount }], me:{ net } }` - `suggestions` is the simplified settle-up plan |
| `POST /api/groups/{id}/settlements` | `{ fromUser, toUser, amount, note? }` | 201. You must be one of the two people (403) and both must be members (400) |
| `GET /api/groups/{id}/settlements` | - | `{ settlements:[{ id, amount, note, settledAt, from, to }] }` newest first |
| `GET /api/settlements` | - | your settlement history across all groups (adds `groupName`) |

## Personal transactions, categories, budgets 🔒
| Method & URL | Body / query | Response |
|---|---|---|
| `GET /api/personal-transactions?month=YYYY-MM` | month defaults to current | `{ transactions:[{ id, kind, amount, description, category, date, notes, recurringId }] }` |
| `POST /api/personal-transactions` | `{ kind: EXPENSE\|INCOME, amount, description, categoryId?, date?, notes? }` | 201 `{ transaction }` |
| `PUT /api/personal-transactions/{id}` · `DELETE …/{id}` | same body | `{ transaction }` / `{ deleted:true }` (own only; others get 404) |
| `GET /api/categories` | - | `{ categories:[{ id, name, kind, custom }] }` (system + yours) |
| `POST /api/categories` · `DELETE /api/categories/{id}` | `{ name, kind }` | 201 / `{ deleted:true }` (custom only) |
| `GET /api/budgets?month=YYYY-MM` | - | `{ month, income, totalSpent, headline:{ limit, spent, remaining, percentUsed }, items:[{ id, categoryId, category, limit, spent, remaining, percentUsed }] }` |
| `PUT /api/budgets` | `{ month, categoryId?: null=overall, limit }` | upserts, returns the month view |
| `PUT /api/budgets/income` | `{ month, income }` | month view |
| `DELETE /api/budgets/{id}` | - | `{ deleted:true }` |

`spent` always means **your own share** (personal expenses + your split of group bills).

## Recurring 🔒
| Method & URL | Body | Response |
|---|---|---|
| `GET /api/recurring` | - | `{ rules:[{ id, target, frequency, startDate, nextRun, endDate, active, description, amount, groupId }] }` |
| `POST /api/recurring` | `{ target: PERSONAL\|GROUP, frequency: DAILY\|WEEKLY\|MONTHLY\|YEARLY, startDate, endDate?, description, amount, categoryId?, groupId?, paidBy?, split? }` (GROUP needs `groupId` + `split`, same shape as expenses) | 201 `{ rule }` |
| `PATCH /api/recurring/{id}` | `{ active: boolean }` | pause / resume |
| `DELETE /api/recurring/{id}` | - | `{ deleted:true }` (already generated items stay) |
| `GET\|POST /api/cron/recurring` | header `Authorization: Bearer $CRON_SECRET` (no session) | `{ rulesProcessed, created, failed, date }`; 401 otherwise. Idempotent |

## Analytics & dashboard 🔒
| Method & URL | Response |
|---|---|
| `GET /api/dashboard` | `{ month, owe, owed, net, monthSpending, budgetRemaining, budgetPercentUsed }` |
| `GET /api/analytics/personal?month=` | `{ totalSpent, byCategory[], highestCategory, trend[6], monthOverMonth{ change, percentChange }, averageDaily, budgetVsActual[], incomeVsExpenses{ income, expenses, savings }, largestExpenses[] }` |
| `GET /api/analytics/shared?month=` | `{ amountPaidForOthers, owedToMe, iOwe, net, settlements{ paid, received }, groupSpending[], groupSpendingOverTime[6], categoryBreakdown[] }` |

## Notifications & preferences 🔒
| Method & URL | Body | Response |
|---|---|---|
| `GET /api/notifications` | - | `{ unread, notifications:[{ id, type, message, data, read, createdAt }] }` |
| `POST /api/notifications/read-all` · `POST /api/notifications/{id}/read` | - | `{ done:true }` |
| `GET /api/preferences` | - | `{ theme }` |
| `PUT /api/preferences` | `{ theme }` one of `light dark iron_man spider_man thor venom doctor_strange captain_america moon_knight loki batman superman flash wonder_woman` | `{ theme }` (400 otherwise) |
