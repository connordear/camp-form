import { beforeEach, describe, expect, mock, test } from "bun:test";

const created: Array<Record<string, unknown>> = [];
const dbUpdates: Array<Record<string, unknown>> = [];
let storedRedeemBy: number | null = null;

mock.module("@/lib/stripe", () => ({
  stripe: {
    coupons: {
      retrieve: async (id: string) => ({ id, redeem_by: storedRedeemBy }),
      create: async (params: Record<string, unknown>) => {
        created.push(params);
        return { id: "coupon_new" };
      },
    },
  },
}));

mock.module("@/lib/data/db", () => ({
  db: {
    update: () => ({
      set: (values: Record<string, unknown>) => ({
        where: async () => {
          dbUpdates.push(values);
        },
      }),
    }),
  },
}));

const { couponRedeemBy, getRedeemableCouponId } = await import(
  "./discount-coupon-service"
);

type Discount = Parameters<typeof getRedeemableCouponId>[0];

const earlyBird = {
  id: "d1",
  name: "Early Bird",
  type: "percentage",
  amount: 10,
  conditionType: "deadline",
  deadlineDate: "2027-03-31",
  stripeCouponId: "coupon_old",
} as Discount;

// End of 31 March 2027 in Alberta (UTC-6 in daylight time).
const END_OF_DAY_AT_CAMP = Date.UTC(2027, 3, 1, 5, 59, 59) / 1000;
// What coupons made before the fix carry: end of the day in UTC.
const END_OF_DAY_UTC = Date.UTC(2027, 2, 31, 23, 59, 59) / 1000;
const beforeDeadline = new Date("2027-03-31T20:00:00Z");

beforeEach(() => {
  created.length = 0;
  dbUpdates.length = 0;
  storedRedeemBy = null;
});

describe("couponRedeemBy", () => {
  test("is the end of the deadline day at camp", () => {
    expect(couponRedeemBy(earlyBird)).toBe(END_OF_DAY_AT_CAMP);
  });

  test("is undefined for discounts without a deadline", () => {
    expect(
      couponRedeemBy({ ...earlyBird, conditionType: "sibling" }),
    ).toBeUndefined();
  });
});

describe("getRedeemableCouponId", () => {
  test("replaces a coupon that expires before the deadline does", async () => {
    storedRedeemBy = END_OF_DAY_UTC;
    expect(await getRedeemableCouponId(earlyBird, beforeDeadline)).toBe(
      "coupon_new",
    );
    expect(created).toEqual([
      {
        name: "Early Bird",
        currency: "cad",
        percent_off: 10,
        redeem_by: END_OF_DAY_AT_CAMP,
      },
    ]);
    expect(dbUpdates).toEqual([{ stripeCouponId: "coupon_new" }]);
  });

  test("keeps a coupon that already lasts the full day", async () => {
    storedRedeemBy = END_OF_DAY_AT_CAMP;
    expect(await getRedeemableCouponId(earlyBird, beforeDeadline)).toBe(
      "coupon_old",
    );
    expect(created).toEqual([]);
    expect(dbUpdates).toEqual([]);
  });

  test("leaves coupons alone once the deadline has passed", async () => {
    storedRedeemBy = END_OF_DAY_UTC;
    const after = new Date("2027-04-01T06:00:00Z");
    expect(await getRedeemableCouponId(earlyBird, after)).toBe("coupon_old");
    expect(created).toEqual([]);
  });

  test("does not call Stripe for discounts without a deadline", async () => {
    const sibling = {
      ...earlyBird,
      conditionType: "sibling",
      deadlineDate: null,
    } as Discount;
    expect(await getRedeemableCouponId(sibling, beforeDeadline)).toBe(
      "coupon_old",
    );
    expect(
      await getRedeemableCouponId({ ...earlyBird, stripeCouponId: null }),
    ).toBeNull();
  });
});
