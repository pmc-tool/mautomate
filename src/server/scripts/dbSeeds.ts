import { faker } from "@faker-js/faker";
import type { PrismaClient } from "@prisma/client";
import { type User } from "wasp/entities";
import {
  getSubscriptionPaymentPlanIds,
  SubscriptionStatus,
} from "../../payment/plans";
import { PLAN_CREDIT_ALLOTMENTS, TRIAL_CREDITS } from "../../credits/creditConfig";

type MockUserData = Omit<User, "id">;

/**
 * This function, which we've imported in `app.db.seeds` in the `main.wasp` file,
 * seeds the database with mock users via the `wasp db seed` command.
 * For more info see: https://wasp.sh/docs/data-model/backends#seeding-the-database
 */
export async function seedMockUsers(prismaClient: PrismaClient) {
  await Promise.all(
    generateMockUsersData(50).map((data) => prismaClient.user.create({ data })),
  );
}

function generateMockUsersData(numOfUsers: number): MockUserData[] {
  return faker.helpers.multiple(generateMockUserData, { count: numOfUsers });
}

function generateMockUserData(): MockUserData {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const subscriptionStatus =
    faker.helpers.arrayElement<SubscriptionStatus | null>([
      ...Object.values(SubscriptionStatus),
      null,
    ]);
  const now = new Date();
  const createdAt = faker.date.past({ refDate: now });
  const timePaid = faker.date.between({ from: createdAt, to: now });

  const subscriptionPlan = subscriptionStatus
    ? faker.helpers.arrayElement(getSubscriptionPaymentPlanIds())
    : null;

  // Compute credit buckets
  const planCredits = subscriptionPlan
    ? PLAN_CREDIT_ALLOTMENTS[subscriptionPlan] ?? 0
    : 0;
  const topUpCredits = faker.helpers.maybe(
    () => faker.number.int({ min: 0, max: 500 }),
    { probability: 0.2 },
  ) ?? 0;
  const trialCredits = subscriptionStatus ? 0 : TRIAL_CREDITS;

  const hasUserPaidOnStripe = !!subscriptionStatus || topUpCredits > 0;

  // Credit reset date: next month from datePaid
  const creditResetDate = subscriptionStatus
    ? new Date(timePaid.getTime() + 30 * 24 * 60 * 60 * 1000)
    : null;

  return {
    email: faker.internet.email({ firstName, lastName }),
    username: faker.internet.userName({ firstName, lastName }),
    createdAt,
    isAdmin: false,
    planCredits,
    topUpCredits,
    trialCredits,
    creditResetDate,
    subscriptionStatus,
    lemonSqueezyCustomerPortalUrl: null,
    paymentProcessorUserId: hasUserPaidOnStripe
      ? `cus_test_${faker.string.uuid()}`
      : null,
    datePaid: hasUserPaidOnStripe
      ? faker.date.between({ from: createdAt, to: timePaid })
      : null,
    subscriptionPlan,
    fullName: faker.person.fullName({ firstName, lastName }),
    phone: faker.helpers.maybe(() => faker.phone.number(), { probability: 0.3 }) ?? null,
    bio: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.2 }) ?? null,
    avatarUrl: null,
    company: faker.helpers.maybe(() => faker.company.name(), { probability: 0.4 }) ?? null,
  };
}
