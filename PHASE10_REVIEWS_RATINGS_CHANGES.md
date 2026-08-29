# Phase 10 — Reviews & Ratings

This phase builds on all previous Borrowly phases.

## Backend
- Kept the existing rule that only a borrower who has a `returned` borrowing can review an item.
- Kept one review per user/item through the existing unique database constraint.
- `GET /api/my-borrowings` now includes the authenticated user's review for each borrowed item as `review`.
- `GET /api/items/{item}` now includes review users, `reviews_count`, and `reviews_avg_rating` for real item-detail ratings.
- Public review responses only expose the reviewer's `id` and `name` instead of private profile fields.
- Public item responses expose only the owner's `id` and `name` inside the owner object.
- Review comments are trimmed before create/update.
- Existing review endpoints remain:
  - `GET /api/items/{itemId}/reviews`
  - `POST /api/reviews`
  - `PUT /api/reviews/{id}`
  - `DELETE /api/reviews/{id}`

## Frontend
- Item Details now renders real review cards from the backend.
- Item Details shows the real average rating and review count.
- Returned borrowings show a **Leave review** action.
- If a review already exists, the action becomes **Edit review** and displays the current star rating.
- Added a review modal with 1–5 star selection and an optional comment.
- New reviews use `POST /api/reviews`; edits use `PUT /api/reviews/{id}`.
- The My Borrowings list reloads after posting/editing so the review state stays in sync.

## Database
No new migration is required for Phase 10. The existing `reviews` table already supports this workflow.
