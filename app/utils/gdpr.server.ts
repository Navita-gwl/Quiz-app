import db from "../db.server";

const REDACTED_NAME = "Redacted";

function redactedEmail(recordId: string) {
  return `redacted-${recordId}@redacted.invalid`;
}

type CustomerPayload = {
  id?: number;
  email?: string;
  phone?: string;
};

type DataRequestPayload = {
  shop_id?: number;
  shop_domain?: string;
  customer?: CustomerPayload;
  data_request?: { id?: number };
  orders_requested?: number[];
};

type CustomerRedactPayload = {
  shop_id?: number;
  shop_domain?: string;
  customer?: CustomerPayload;
  orders_to_redact?: number[];
};

type ShopRedactPayload = {
  shop_id?: number;
  shop_domain?: string;
};

function customerIdString(customer?: CustomerPayload) {
  if (customer?.id == null) return undefined;
  return String(customer.id);
}

async function findSubmissionsForCustomer(shop: string, customer?: CustomerPayload) {
  const email = customer?.email?.trim();
  const customerId = customerIdString(customer);

  const byEmail = email
    ? await db.quizSubmission.findMany({
        where: { shopId: shop, email },
        include: {
          answers: true,
          category: { select: { title: true, quizPublicId: true } },
        },
      })
    : [];

  const byCustomerId =
    customerId != null
      ? await db.quizSubmission.findMany({
          where: {
            shopId: shop,
            answers: { some: { customerId } },
          },
          include: {
            answers: true,
            category: { select: { title: true, quizPublicId: true } },
          },
        })
      : [];

  const merged = new Map<string, (typeof byEmail)[number]>();
  for (const submission of [...byEmail, ...byCustomerId]) {
    merged.set(submission.id, submission);
  }

  return [...merged.values()];
}

export async function handleCustomerDataRequest(shop: string, payload: DataRequestPayload) {
  const customer = payload.customer;
  const submissions = await findSubmissionsForCustomer(shop, customer);

  const exportBundle = {
    shop,
    shopDomain: payload.shop_domain,
    dataRequestId: payload.data_request?.id,
    customer: {
      id: customer?.id,
      email: customer?.email,
    },
    quizSubmissions: submissions.map((submission) => ({
      id: submission.id,
      quizTitle: submission.category?.title ?? null,
      quizPublicId: submission.category?.quizPublicId ?? null,
      name: submission.name,
      email: submission.email,
      createdAt: submission.createdAt,
      answers: submission.answers.map((answer) => ({
        id: answer.id,
        questionText: answer.questionText,
        answer: answer.answer,
        customerId: answer.customerId,
        createdAt: answer.createdAt,
      })),
    })),
  };

  console.log(
    `[GDPR customers/data_request] Shop: ${shop} | request: ${payload.data_request?.id ?? "n/a"} | submissions: ${submissions.length} | merchant access: QuizInsights > Responses (search: ${customer?.email ?? "customer email"})`,
  );

  return exportBundle;
}

export async function handleCustomerRedact(shop: string, payload: CustomerRedactPayload) {
  const customer = payload.customer;
  const submissions = await findSubmissionsForCustomer(shop, customer);
  const customerId = customerIdString(customer);

  for (const submission of submissions) {
    await db.quizSubmission.update({
      where: { id: submission.id },
      data: {
        name: REDACTED_NAME,
        email: redactedEmail(submission.id),
        recommendations: null,
      },
    });
  }

  if (customerId) {
    await db.answer.updateMany({
      where: { shopId: shop, customerId },
      data: { customerId: null },
    });
  }

  console.log(`[GDPR customers/redact] Shop: ${shop}`);
  console.log(
    `[GDPR customers/redact] Anonymized ${submissions.length} quiz submission(s) for customer ${customer?.email ?? customerId ?? "unknown"}`,
  );

  return { submissionsAnonymized: submissions.length };
}

export async function handleShopRedact(shop: string, payload: ShopRedactPayload) {
  const submissions = await db.quizSubmission.findMany({
    where: { shopId: shop },
    select: { id: true },
  });

  for (const submission of submissions) {
    await db.quizSubmission.update({
      where: { id: submission.id },
      data: {
        name: REDACTED_NAME,
        email: redactedEmail(submission.id),
        recommendations: null,
      },
    });
  }

  await db.answer.updateMany({
    where: { shopId: shop },
    data: { customerId: null },
  });

  const [categoryCount, questionCount, settingsCount] = await Promise.all([
    db.category.count({ where: { shopId: shop } }),
    db.question.count({ where: { shopId: shop } }),
    db.quizSettings.count({ where: { shopId: shop } }),
  ]);

  console.log(`[GDPR shop/redact] Shop: ${shop} (shop_id: ${payload.shop_id ?? "n/a"})`);
  console.log(
    `[GDPR shop/redact] Anonymized ${submissions.length} quiz submission(s) and cleared linked customer IDs from answers`,
  );
  console.log(
    `[GDPR shop/redact] Merchant quiz configuration retained — categories: ${categoryCount}, questions: ${questionCount}, settings: ${settingsCount}`,
  );

  return {
    submissionsAnonymized: submissions.length,
    categoriesRetained: categoryCount,
    questionsRetained: questionCount,
    settingsRetained: settingsCount,
  };
}
