import { useState } from "react";
import type { MetaFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import PublicLayout from "../../components/PublicLayout";
import { getShopPlan } from "../../billing.server";
import { checkFeatureAccess } from "../../feature";

export const meta: MetaFunction = () => {
  return [
    { title: "Frequently Asked Questions - QuizInsights" },
    { name: "description", content: "Common questions and answers about managing quizzes, questions, product recommendations, and integrations." },
  ];
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");

  let hasHydrogenAccess = false;
  if (shop) {
    const currentPlan = await getShopPlan(shop);
    hasHydrogenAccess = checkFeatureAccess(currentPlan, "hydrogen");
  }

  return {
    hasHydrogenAccess,
  };
};

interface FAQItem {
  question: string;
  answer: React.ReactNode;
}

export default function FAQRoute() {
  const { hasHydrogenAccess } = useLoaderData<typeof loader>();
  const [openItems, setOpenItems] = useState<Record<number, boolean>>({});

  const toggleFAQ = (index: number) => {
    setOpenItems((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const rawFaqs: FAQItem[] = [
    {
      question: "Can I create more than one quiz?",
      answer: (
        <p>
          Yes. Under the <strong>Questions</strong> tab, you can create multiple quizzes. Each quiz operates independently, contains its own questions, and generates its own responses.
        </p>
      ),
    },
    {
      question: "What is a Quiz ID?",
      answer: (
        <p>
          A Quiz ID is a unique 8-character code (for example: <code>rx9fv7ue</code>) assigned to each quiz you create. You need this ID when publishing the quiz on your Shopify storefront.
        </p>
      ),
    },
    {
      question: "Where do I find the Quiz ID?",
      answer: (
        <p>
          Go to the <strong>Questions</strong> tab in the app admin. The Quiz ID is displayed in the list next to the name of each quiz.
        </p>
      ),
    },
    {
      question: "How do I add questions to a quiz?",
      answer: (
        <p>
          In the <strong>Questions</strong> tab, select your quiz from the list and click <strong>Add Question</strong>. Enter your question text, choose a question type, and add your answer options.
        </p>
      ),
    },
    {
      question: "What question types can I choose from?",
      answer: (
        <p>
          You can choose <strong>Radio</strong> (one answer), <strong>Checkbox</strong> (multiple answers), <strong>Dropdown (Single Selection)</strong>, or <strong>Dropdown (Multiple Selection)</strong>. Options can be shown as text lists, grids, or image choices.
        </p>
      ),
    },
    {
      question: "Can I change the order of the questions?",
      answer: (
        <p>
          Yes. In the <strong>Questions</strong> tab, you can use the drag-and-drop handles next to each question to reorder them. The changes save automatically.
        </p>
      ),
    },
    {
      question: "How do Product Recommendations work?",
      answer: (
        <p>
          When editing answer options under the <strong>Questions</strong> tab, you can link one or more Shopify products to each answer. When a customer selects that option, those products are included in the recommendations shown at the end of the quiz.
        </p>
      ),
    },
    {
      question: "Can I link different products to different answers?",
      answer: (
        <p>
          Yes. Each answer option can have its own linked product or products. At the end of the quiz, QuizInsights combines the products matched to the customer&apos;s selected answers and shows them as recommendations.
        </p>
      ),
    },
    {
      question: "How do I set up Lead Collection?",
      answer: (
        <p>
          Open a quiz from the <strong>Questions</strong> tab and go to <strong>Customize</strong>. There you can enable or disable the lead form and choose whether to collect name and email. Global form text, placement, and styling defaults can be managed in the <strong>Settings</strong> tab.
        </p>
      ),
    },
    {
      question: "Is the lead collection form mandatory for customers?",
      answer: (
        <p>
          No. Lead collection is optional. If you disable the lead form, or turn off both name and email fields, customers can complete the quiz without submitting contact details. When a field is enabled, that field is required before the customer can continue.
        </p>
      ),
    },
    {
      question: "How do I publish a quiz using the Theme Extension?",
      answer: (
        <p>
          Go to Shopify Admin &gt; <strong>Online Store</strong> &gt; <strong>Themes</strong> &gt; <strong>Customize</strong>. Add a section or block, select the <strong>Quiz</strong> block from QuizInsights, paste your 8-character Quiz ID in the block settings in the sidebar, and save.
        </p>
      ),
    },
    {
      question: "Do I need to edit theme code to publish a quiz?",
      answer: (
        <p>
          No. The app uses Shopify's native <strong>Theme Extensions</strong>. You add the block directly in the Shopify Theme Editor without modifying Liquid template files.
        </p>
      ),
    },
    {
      question: "Will the quiz layout match my theme colors?",
      answer: (
        <p>
          The quiz inherits your theme's typography automatically. You can customize the background, text, borders, buttons, and input field colors directly in the <strong>Settings</strong> tab of the app.
        </p>
      ),
    },
    {
      question: "Can I customize the start and submit button text?",
      answer: (
        <p>
          Yes. Go to the <strong>Settings</strong> tab. You can customize the text for the start button, the submit button, the lead form headings, and the completion messages.
        </p>
      ),
    },
    {
      question: "Where can I see the responses and leads?",
      answer: (
        <p>
          Go to the <strong>Responses</strong> tab in the app admin. You will see a chronological list of submissions, including customer names and emails when lead collection was enabled.
        </p>
      ),
    },
    {
      question: "Can I view the specific answers a customer chose?",
      answer: (
        <p>
          Yes. In the <strong>Responses</strong> tab, click <strong>View Details</strong> next to any submission to see each question and the answer options the customer selected.
        </p>
      ),
    },
    {
      question: "How do I embed the quiz into a headless Hydrogen store?",
      answer: (
        <p>
          Headless embeds are available on the <strong>Starter</strong> plan. You can use an iframe pointing to <code>{`https://[YOUR_DOMAIN]/embed/quiz?shop=[SHOP]&quizId=[QUIZ_ID]`}</code>, or fetch quiz data through the public JSON API from your storefront.
        </p>
      ),
    },
    {
      question: "What endpoint do I use to query quiz data over API?",
      answer: (
        <p>
          On the Starter plan, send a GET request to <code>{`/api/public/quiz?shop=[SHOP_DOMAIN]&quizId=[QUIZ_ID]`}</code>. This returns questions, settings, and answer option data in JSON format.
        </p>
      ),
    },
    {
      question: "How do I submit quiz answers from a headless site?",
      answer: (
        <p>
          On the Starter plan, send a POST request to <code>{`/api/public/submit`}</code>. The payload must include the shop domain, quiz ID, customer name and email when required, and an array of answers with each question ID and selected answer value.
        </p>
      ),
    },
    {
      question: "Can I add custom styling rules?",
      answer: (
        <p>
          Yes, on the <strong>Starter</strong> plan. In the <strong>Settings</strong> tab, use the Custom CSS field to add styling rules for quiz cards, buttons, and inputs. Per-quiz design overrides are also available in the quiz <strong>Customize</strong> screen.
        </p>
      ),
    },
    {
      question: "What happens to my data if I uninstall the app?",
      answer: (
        <p>
          When you uninstall the app, Shopify sends webhook notifications to our servers. Session access is removed immediately, and customer quiz data is anonymized after Shopify&apos;s shop redaction process. Merchant quiz configuration may be retained separately in line with our privacy policy.
        </p>
      ),
    },
  ];

  const faqs = rawFaqs.filter((faq) => {
    const isStarterOnlyQuestion =
      faq.question.includes("headless") ||
      faq.question.includes("endpoint") ||
      faq.question.includes("API") ||
      faq.question.includes("custom styling");
    if (isStarterOnlyQuestion && !hasHydrogenAccess) {
      return false;
    }
    return true;
  });

  return (
    <PublicLayout>
      <div className="space-y-6 text-slate-800">
        <header className="border-b border-slate-200 pb-4 mb-6">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Frequently Asked Questions
          </h1>
          <p className="text-slate-500 mt-2 text-sm">
            Answers to common questions about setting up and using QuizInsights.
          </p>
        </header>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = !!openItems[index];
            return (
              <div
                key={index}
                className="border-b border-slate-200 pb-4"
              >
                <button
                  type="button"
                  onClick={() => toggleFAQ(index)}
                  className="w-full py-2 text-left flex justify-between items-center hover:text-indigo-600 focus:outline-none"
                  aria-expanded={isOpen}
                >
                  <span className="font-semibold text-slate-950 text-base">
                    {faq.question}
                  </span>
                  <span className="ml-4 flex-shrink-0 text-slate-400">
                    {isOpen ? (
                      <svg className="h-5 w-5 transform rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    )}
                  </span>
                </button>

                {isOpen && (
                  <div className="mt-2 text-slate-600 leading-relaxed text-sm">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </PublicLayout>
  );
}
