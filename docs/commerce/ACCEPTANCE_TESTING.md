# Commerce Acceptance Testing

## Scenario A: Delivery and Cash

1. Open `/order/dubai-delights`.
2. Add Chicken Biryani.
3. Use checkout for Arun Kumar with delivery.
4. Use Cash on Delivery.
5. Apply `WELCOME10`.
6. Confirm the order appears in `/commerce?section=orders&status=PENDING`.
7. Move the order through Accepted, Preparing, Ready, Rider Assigned, Picked Up, Out for Delivery, Delivered, and Completed.
8. Confirm reports update in `/commerce?section=reports`.

Expected: delivery workflow completes and payment can be recorded as collected.

## Scenario B: Pickup and Card Machine

1. Add Butter Chicken, Butter Naan, and Mango Lassi.
2. Checkout as Fathima Rahman.
3. Select Pickup and Card Machine on Pickup.
4. Move the order through Accepted, Preparing, Ready, and Completed.

Expected: no rider is required.

## Scenario C: Rejected Order

1. Create an order for Mohammed Salim.
2. Reject it from Commerce with a reason.
3. Open the secure tracking link.

Expected: tracking shows rejected status without internal notes or private IDs.

## Scenario D: Cancelled Order

1. Create and accept an order.
2. Cancel it with a reason.
3. Attempt to move it to Preparing.

Expected: invalid transition is rejected.

## Scenario E: Closed Restaurant

1. Set `CommerceBusinessSettings.acceptingOrders` to false for Dubai Delights.
2. Open `/order/dubai-delights`.
3. Attempt checkout.

Expected: menu remains visible and checkout is prevented with the closure message.

## Scenario F: Out-of-Stock Product

1. Set Chicken Biryani `inStock` to false.
2. Attempt to order it.

Expected: server rejects the order while historical orders remain intact.

## Scenario G: Promotion

1. Apply `WELCOME10` to an order below AED 30.
2. Apply it to an order above AED 30.
3. Use a large enough cart to hit the AED 10 maximum discount.

Expected: minimum order and maximum discount are enforced server-side.

## Scenario H: Studio Media

1. Approve a Studio media asset for external use.
2. Assign it to a Commerce placement or product/category usage.
3. Open `/order/dubai-delights`.

Expected: approved media appears on the public ordering page and archived/unapproved media is not selected for new placement.
