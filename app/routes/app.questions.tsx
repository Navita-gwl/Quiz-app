import { useState, useEffect } from "react";
import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { useLoaderData, useFetcher, useSearchParams, redirect, useNavigate, useSubmit, useActionData, useRevalidator } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { QuestionList } from "../components/QuestionList";
import { AddQuestionModal } from "../components/AddQuestionModal";
import { ViewQuizModal } from "../components/ViewQuizModal";
import { useConfirmDialog } from "../components/ConfirmDialog";
import db from "../db.server";
import { generateUniquePublicId } from "../utils/hash.server";
import { enrichQuestionsWithProducts } from "../utils/enrichment.server";
import { GENERIC_LOAD_ERROR, jsonActionError, resolveFetcherError, toUserFacingError } from "../utils/userFacingErrors";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  Plus,
  Copy,
  Check,
  ArrowLeft,
  Trash2,
  Edit3,
  Eye,
  Layers,
  Sliders,
  MoreVertical,
  Inbox,
  AlertCircle
} from "lucide-react";

function sluggify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const url = new URL(request.url);

  let categories = await db.category.findMany({
    where: { shopId: session.shop },
    orderBy: { createdAt: "desc" },
  });

  const categoryQuestionCounts = await db.question.groupBy({
    by: ["categoryId"],
    where: { shopId: session.shop },
    _count: { id: true },
  });

  const questionCountsMap = categoryQuestionCounts.reduce((acc, curr) => {
    if (curr.categoryId) {
      acc[curr.categoryId] = curr._count.id;
    }
    return acc;
  }, {} as Record<string, number>);

  let categoriesChanged = false;
  for (const cat of categories) {
    if (!cat.quizPublicId) {
      const publicId = await generateUniquePublicId();
      await db.category.update({
        where: { id: cat.id },
        data: { quizPublicId: publicId }
      });
      cat.quizPublicId = publicId;
      categoriesChanged = true;
    }
  }
  if (categoriesChanged) {
    categories = await db.category.findMany({
      where: { shopId: session.shop },
      orderBy: { createdAt: "desc" },
    });
  }

  const quizList = categories.map((cat) => ({
    id: cat.id,
    title: cat.title,
    handle: cat.handle,
    quizPublicId: cat.quizPublicId,
    createdAt: cat.createdAt,
    questionCount: questionCountsMap[cat.id] || 0,
  }));

  const quizId = url.searchParams.get("quizId");

  if (quizId) {
    const activeQuiz = categories.find((c) => c.id === quizId);
    if (!activeQuiz) {
      return redirect("/app/questions");
    }

    const page = parseInt(url.searchParams.get("page") || "1");
    const all = url.searchParams.get("all") === "true";
    const limit = 8;
    const skip = (page - 1) * limit;

    try {
      const [rawQuestions, totalCount] = await Promise.all([
        db.question.findMany({
          where: {
            shopId: session.shop,
            categoryId: activeQuiz.id,
          },
          orderBy: {
            position: "asc",
          },
          ...(all ? {} : { skip, take: limit }),
        }),
        db.question.count({
          where: {
            shopId: session.shop,
            categoryId: activeQuiz.id,
          },
        }),
      ]);

      // Strip legacy base64 data URIs from options before enrichment.
      // Storing base64 images in MySQL JSON columns causes very large payloads
      // that break the Prisma query or React Router serialization.
      // New uploads go to Shopify CDN and are stored as URLs instead.
      const sanitizedQuestions = rawQuestions.map((q: any) => {
        if (!Array.isArray(q.options)) return q;
        const sanitizedOptions = q.options.map((opt: any) => {
          if (
            opt &&
            typeof opt === "object" &&
            typeof opt.imageSrc === "string" &&
            opt.imageSrc.startsWith("data:image/")
          ) {
            // Replace with a placeholder — the edit modal will prompt re-upload
            return { ...opt, imageSrc: "__legacy_base64__" };
          }
          return opt;
        });
        return { ...q, options: sanitizedOptions };
      });

      const questions = await enrichQuestionsWithProducts(admin, sanitizedQuestions);

      return {
        view: "quiz_details" as const,
        quiz: {
          id: activeQuiz.id,
          title: activeQuiz.title,
          handle: activeQuiz.handle,
          quizPublicId: activeQuiz.quizPublicId,
        },
        questions,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
        totalQuestionsCount: totalCount,
        quizzes: quizList,
      };
    } catch (error) {
      console.error("Error fetching questions:", error);
      return {
        view: "quiz_details" as const,
        quiz: {
          id: activeQuiz.id,
          title: activeQuiz.title,
          handle: activeQuiz.handle,
          quizPublicId: activeQuiz.quizPublicId,
        },
        questions: [],
        totalPages: 0,
        currentPage: 1,
        totalQuestionsCount: 0,
        loadError: GENERIC_LOAD_ERROR,
        quizzes: quizList,
      };
    }
  }

  return {
    view: "quiz_list" as const,
    quizzes: quizList,
    quiz: null,
    questions: [],
    totalPages: 0,
    currentPage: 1,
    totalQuestionsCount: 0,
  };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  try {
    if (intent === "create_category" || intent === "create_quiz") {
      const title = formData.get("title") as string;
      if (!title || title.trim() === "") {
        return Response.json({ success: false, error: "Title is required" }, { status: 400 });
      }

      const allCategories = await db.category.findMany({
        where: { shopId: session.shop },
      });
      const isDuplicate = allCategories.some(
        (c) => c.title.trim().toLowerCase() === title.trim().toLowerCase()
      );
      if (isDuplicate) {
        return Response.json({ success: false, error: "This quiz name already exists." }, { status: 400 });
      }

      let handle = sluggify(title);
      if (handle === "") handle = "quiz";

      const existingHandle = await db.category.findFirst({
        where: { shopId: session.shop, handle },
      });

      if (existingHandle) {
        const randomStr = Math.random().toString(36).substring(2, 6);
        handle = `${handle}-${randomStr}`;
      }

      const publicId = await generateUniquePublicId();
      const category = await db.category.create({
        data: {
          shopId: session.shop,
          title: title.trim(),
          handle,
          quizPublicId: publicId,
          settings: { quizDisplayMode: 'step' },
        },
      });

      return redirect(`/app/questions?quizId=${category.id}`);
    }

    if (intent === "update_category" || intent === "update_quiz") {
      const id = formData.get("id") as string;
      const title = formData.get("title") as string;

      if (!id || !title || title.trim() === "") {
        return Response.json({ success: false, error: "ID and Title are required" }, { status: 400 });
      }

      const category = await db.category.findUnique({ where: { id } });
      if (!category || category.shopId !== session.shop) {
        return Response.json({ success: false, error: "Quiz not found" }, { status: 404 });
      }

      const allCategories = await db.category.findMany({
        where: { shopId: session.shop },
      });
      const isDuplicate = allCategories.some(
        (c) => c.id !== id && c.title.trim().toLowerCase() === title.trim().toLowerCase()
      );
      if (isDuplicate) {
        return Response.json({ success: false, error: "This quiz name already exists." }, { status: 400 });
      }

      let handle = sluggify(title);
      if (handle === "") handle = "quiz";

      const duplicateHandle = await db.category.findFirst({
        where: {
          shopId: session.shop,
          handle,
          id: { not: id },
        },
      });

      if (duplicateHandle) {
        const randomStr = Math.random().toString(36).substring(2, 6);
        handle = `${handle}-${randomStr}`;
      }

      const updated = await db.category.update({
        where: { id },
        data: {
          title: title.trim(),
          handle,
        },
      });

      return Response.json({ success: true, category: updated });
    }

    if (intent === "delete_category" || intent === "delete_quiz") {
      const id = formData.get("id") as string;
      if (!id) {
        return Response.json({ success: false, error: "ID is required" }, { status: 400 });
      }

      const categoryToDelete = await db.category.findUnique({ where: { id } });
      if (!categoryToDelete || categoryToDelete.shopId !== session.shop) {
        return Response.json({ success: false, error: "Quiz not found" }, { status: 404 });
      }

      await db.category.delete({ where: { id } });

      return redirect("/app/questions");
    }

    return Response.json({ success: false, error: "Invalid intent" }, { status: 400 });
  } catch (error: unknown) {
    console.error("Action error:", error);
    return jsonActionError(error, "We couldn't complete that action. Please try again.");
  }
};

export default function QuestionsPage() {
  const loaderData = useLoaderData<typeof loader>();
  const actionData = useActionData<any>();
  const {
    view,
    quizzes,
    questions: loadedQuestions,
  } = loaderData;

  const [questions, setQuestions] = useState<any[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [modalOpen, setModalOpen] = useState(false);
  const [editQuestion, setEditQuestion] = useState<any>(null);

  const [categoryModal, setCategoryModal] = useState<"create" | "edit" | null>(null);
  const [categoryTitleInput, setCategoryTitleInput] = useState("");
  const [selectedQuizIdForEdit, setSelectedQuizIdForEdit] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
  const [viewQuiz, setViewQuiz] = useState<any>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [quizNameError, setQuizNameError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetcher = useFetcher<any>();
  const revalidator = useRevalidator();
  const submit = useSubmit();
  const shopify = useAppBridge();
  const navigate = useNavigate();
  const { confirm } = useConfirmDialog();

  const handleDeleteQuiz = async (
    quizId: string,
    quizTitle: string,
    questionCount: number
  ) => {
    const message =
      questionCount > 0
        ? `This quiz contains ${questionCount} question(s). Deleting it will permanently delete all questions inside it.\n\nAre you sure you want to delete "${quizTitle}"?`
        : `Are you sure you want to delete "${quizTitle}"?`;

    const ok = await confirm({
      title: questionCount > 0 ? "Delete Quiz and Questions?" : "Delete Quiz?",
      message,
      confirmLabel: "Delete Quiz",
      cancelLabel: "Cancel",
      variant: "danger",
    });

    if (ok) {
      submit({ intent: "delete_quiz", id: quizId }, { method: "POST" });
    }
  };

  useEffect(() => {
    setCategoryModal(null);
    setSelectedQuizIdForEdit(null);
    setCategoryTitleInput("");
  }, [searchParams]);

  useEffect(() => {
    if (!openDropdownId) return;
    const handleOutsideClick = () => {
      setOpenDropdownId(null);
    };
    document.addEventListener("click", handleOutsideClick);
    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [openDropdownId]);

  useEffect(() => {
    if (view === "quiz_details") {
      setQuestions(loadedQuestions || []);
    } else {
      setQuestions([]);
    }
  }, [loadedQuestions, view]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (fetcher.data?.success) {
      const successMsg = categoryModal === "edit"
        ? "Quiz renamed successfully"
        : "Quiz created successfully";
      shopify.toast.show(successMsg);
      setCategoryModal(null);
      setSelectedQuizIdForEdit(null);
    } else if (fetcher.data?.success === false) {
      shopify.toast.show(
        resolveFetcherError(fetcher.data, "We couldn't complete that action. Please try again.") ||
          "We couldn't complete that action. Please try again.",
        { isError: true }
      );
    }
  }, [fetcher.data, shopify]);

  useEffect(() => {
    if (fetcher.data?.success === false && fetcher.data?.error) {
      setQuizNameError(toUserFacingError(fetcher.data.error, "We couldn't save the quiz name. Please try again."));
    }
  }, [fetcher.data]);

  useEffect(() => {
    if (actionData?.success === false && actionData?.error) {
      setQuizNameError(toUserFacingError(actionData.error, "We couldn't save the quiz name. Please try again."));
    }
  }, [actionData]);

  useEffect(() => {
    setQuizNameError(null);
  }, [categoryModal, categoryTitleInput]);

  const handleAddQuestion = () => {
    setEditQuestion(null);
    setModalOpen(true);
  };

  const handleEditQuestion = (question: any) => {
    setEditQuestion(question);
    setModalOpen(true);
  };

  const handlePageChange = (newPage: number) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set("page", newPage.toString());
    setSearchParams(newParams);
  };

  const copyToClipboard = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    shopify.toast.show("Quiz ID copied");
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = questions.findIndex((q) => q.id === active.id);
    const newIndex = questions.findIndex((q) => q.id === over.id);

    const reorderedQuestions = arrayMove(questions, oldIndex, newIndex);
    setQuestions(reorderedQuestions);

    const positions = reorderedQuestions.map((q, index) => ({
      id: q.id,
      position: index,
    }));

    try {
      const response = await fetch("/api/questions/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positions }),
      });

      if (!response.ok) throw new Error("Failed to reorder");
      shopify.toast.show("Questions reordered");
    } catch (error) {
      console.error("Error reordering questions:", error);
      shopify.toast.show("Failed to reorder questions", { isError: true });
      setQuestions(loadedQuestions || []);
    }
  };

  return (
    <s-page heading="Quizzes & Questions" inlineSize="large">
      <div className="min-h-screen bg-slate-50/50 pb-12 font-sans">

        {view === "quiz_list" ? (
          <div>
            {/* Header Area */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Your Quizzes</h1>
                <p className="text-sm text-slate-500 mt-1">Manage, design, and configure your customer recommendation quizzes.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCategoryTitleInput("");
                  setSelectedQuizIdForEdit(null);
                  setCategoryModal("create");
                }}
                className="inline-flex items-center justify-center px-4.5 py-2.5 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-sm hover:shadow transition-all"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Quiz
              </button>
            </div>

            {/* Quiz Table / Card List or Empty State */}
            {quizzes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center bg-white border border-slate-100 rounded-2xl shadow-sm">
                <div className="w-20 h-20 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300 mb-5">
                  <Inbox className="w-10 h-10" />
                </div>
                <h3 className="font-extrabold text-slate-800 text-xl tracking-tight">No Quizzes Yet</h3>
                <p className="text-slate-500 text-sm max-w-sm mt-2 leading-relaxed">
                  Create your first quiz to start collecting customer responses and recommendations.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCategoryTitleInput("");
                    setSelectedQuizIdForEdit(null);
                    setCategoryModal("create");
                  }}
                  className="mt-6 inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-sm hover:shadow transition-all"
                >
                  <Plus className="w-4 h-4 mr-2" /> Create Your First Quiz
                </button>
              </div>
            ) : (
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm">
                <div className="overflow-visible">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-semibold text-xs uppercase bg-slate-50/50">
                        <th className="px-6 py-4 w-12 text-center rounded-tl-2xl">#</th>
                        <th className="px-6 py-4">Quiz ID</th>
                        <th className="px-6 py-4">Quiz Name</th>
                        <th className="px-6 py-4 text-right rounded-tr-2xl">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {quizzes.map((quiz, index) => {
                        const isLastRow = index === quizzes.length - 1;
                        return (
                          <tr key={quiz.id} className="group hover:bg-slate-50/40 transition-colors">
                            <td className={`px-6 py-4 text-sm font-semibold text-slate-400 ${isLastRow ? 'rounded-bl-2xl' : ''}`}>
                              {index + 1}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <code className="px-2 py-1 bg-slate-100/80 rounded-md font-mono text-xs font-bold text-slate-700">
                                  {quiz.quizPublicId}
                                </code>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(quiz.quizPublicId)}
                                  className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-100 transition-all"
                                  title="Copy Quiz ID"
                                >
                                  {copiedId === quiz.quizPublicId ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-800 text-[14px]">{quiz.title}</span>
                                <span className="inline-flex items-center text-xs text-slate-400 font-medium mt-0.5">
                                  {quiz.questionCount} {quiz.questionCount === 1 ? "question" : "questions"}
                                </span>
                              </div>
                            </td>
                            <td className={`px-6 py-4 text-right whitespace-nowrap ${isLastRow ? 'rounded-br-2xl' : ''}`}>
                              <div className="inline-flex items-center gap-2 relative">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setViewQuiz(quiz);
                                    setViewModalOpen(true);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                                >
                                  <Eye className="w-3.5 h-3.5" /> View
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const newParams = new URLSearchParams(searchParams);
                                    newParams.set("quizId", quiz.id);
                                    newParams.set("page", "1");
                                    setSearchParams(newParams);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 transition-colors"
                                >
                                  <Layers className="w-3.5 h-3.5" /> Questions
                                </button>
                                <button
                                  type="button"
                                  onClick={() => navigate(`/app/quizzes/${quiz.id}/customize`)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors"
                                >
                                  <Sliders className="w-3.5 h-3.5" /> Style
                                </button>

                                {/* Dropdown Options */}
                                <div className="relative">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenDropdownId(openDropdownId === quiz.id ? null : quiz.id);
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                                  >
                                    <MoreVertical className="w-4 h-4" />
                                  </button>

                                  {openDropdownId === quiz.id && (
                                    <div className="absolute right-0 top-8 bg-white border border-slate-200/80 rounded-xl shadow-lg min-w-[140px] z-50 overflow-hidden flex flex-col py-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setCategoryTitleInput(quiz.title);
                                          setSelectedQuizIdForEdit(quiz.id);
                                          setCategoryModal("edit");
                                        }}
                                        className="px-4 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                                      >
                                        Rename Quiz
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          void handleDeleteQuiz(
                                            quiz.id,
                                            quiz.title,
                                            quiz.questionCount
                                          );
                                        }}
                                        className="px-4 py-2 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 border-t border-slate-100 transition-colors"
                                      >
                                        Delete Quiz
                                      </button>
                                    </div>
                                  )}
                                </div>

                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* Back Button */}
            <div className="mb-6">
              <button
                type="button"
                onClick={() => {
                  const newParams = new URLSearchParams(searchParams);
                  newParams.delete("quizId");
                  newParams.delete("page");
                  setSearchParams(newParams);
                }}
                className="inline-flex items-center text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 px-4 py-2 rounded-xl transition-all"
              >
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Quizzes
              </button>
            </div>

            {"loadError" in loaderData && loaderData.loadError ? (
              <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 text-sm font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {loaderData.loadError}
              </div>
            ) : null}

            {/* Quiz Info Header Card */}
            <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                    {loaderData.quiz?.title}
                  </h2>
                  <span className="inline-flex items-center gap-1 bg-indigo-50 border border-indigo-150 text-indigo-700 text-xs px-2.5 py-0.5 rounded-full font-bold">
                    Active Quiz
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500 font-medium">
                  <span>Quiz ID:</span>
                  <code className="px-1.5 py-0.5 bg-slate-100 rounded font-mono font-bold text-slate-700">
                    {loaderData.quiz?.quizPublicId}
                  </code>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(loaderData.quiz?.quizPublicId || "")}
                    className="text-slate-400 hover:text-slate-600 p-0.5 rounded hover:bg-slate-100 transition-colors"
                    title="Copy Quiz ID"
                  >
                    {copiedId === loaderData.quiz?.quizPublicId ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Actions Grid */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setCategoryTitleInput(loaderData.quiz?.title || "");
                    setSelectedQuizIdForEdit(loaderData.quiz?.id || null);
                    setCategoryModal("edit");
                  }}
                  className="inline-flex items-center gap-1 px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Rename Quiz
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/app/quizzes/${loaderData.quiz?.id}/customize`)}
                  className="inline-flex items-center gap-1 px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 transition-colors"
                >
                  <Sliders className="w-3.5 h-3.5" /> Customize Style
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleDeleteQuiz(
                      loaderData.quiz!.id,
                      loaderData.quiz!.title,
                      loaderData.totalQuestionsCount
                    );
                  }}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-50/50 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Quiz
                </button>
              </div>
            </div>

            {/* Questions Section Title & Trigger */}
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-800">Quiz Questions</h3>
                <p className="text-xs text-slate-500 mt-0.5">Drag to rearrange, click edit to manage details.</p>
              </div>
              <button
                type="button"
                onClick={handleAddQuestion}
                className="inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Question
              </button>
            </div>

            {/* Questions Drag Drop Container */}
            <div>
              {questions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center bg-white border border-slate-100 rounded-2xl p-8 shadow-sm">
                  <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 mb-4">
                    <Inbox className="w-8 h-8" />
                  </div>
                  <h3 className="font-extrabold text-slate-800 text-lg tracking-tight">No Questions Added</h3>
                  <p className="text-slate-500 text-sm max-w-sm mt-1 leading-relaxed">
                    Build your product advisor quiz structure by adding questions.
                  </p>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={questions.map((q) => q.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <QuestionList questions={questions || []} onEdit={handleEditQuestion} />
                  </SortableContext>
                </DndContext>
              )}

              {/* Pagination */}
              {loaderData.totalPages > 1 && (
                <div className="flex justify-center items-center gap-4 mt-8 pb-8">
                  <button
                    type="button"
                    disabled={loaderData.currentPage <= 1}
                    onClick={() => handlePageChange(loaderData.currentPage - 1)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-650 bg-white border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="text-xs font-semibold text-slate-500">
                    Page {loaderData.currentPage} of {loaderData.totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={loaderData.currentPage >= loaderData.totalPages}
                    onClick={() => handlePageChange(loaderData.currentPage + 1)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-slate-650 bg-white border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Add / Edit Question Modal */}
      {modalOpen && loaderData.quiz && (
        <AddQuestionModal
          key={editQuestion?.id ?? "new"}
          open={modalOpen}
          editQuestion={editQuestion}
          categoryId={loaderData.quiz.id}
          onSaved={() => revalidator.revalidate()}
          onClose={() => {
            setModalOpen(false);
            setEditQuestion(null);
          }}
        />
      )}

      {/* Quiz Creation / Editing Modal */}
      {categoryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-[440px] w-full border border-slate-100 overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4.5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <span className="text-base font-bold text-slate-800">
                {categoryModal === "create" ? "Add Quiz" : "Rename Quiz"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setCategoryModal(null);
                  setSelectedQuizIdForEdit(null);
                }}
                className="inline-flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">Quiz Title</label>
                <input
                  type="text"
                  value={categoryTitleInput}
                  onChange={(e) => setCategoryTitleInput(e.target.value)}
                  placeholder="e.g. Skin Care Finder"
                  className={`w-full h-11 px-3.5 border rounded-xl text-[14px] font-medium outline-none transition-all ${quizNameError
                      ? "border-rose-350 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/10"
                      : "border-slate-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                    }`}
                  autoFocus
                />
                {quizNameError && (
                  <span className="text-xs font-semibold text-rose-600 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {quizNameError}
                  </span>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setCategoryModal(null);
                    setSelectedQuizIdForEdit(null);
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-250 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const trimmedTitle = categoryTitleInput.trim();
                    if (!trimmedTitle) {
                      shopify.toast.show("Title is required", { isError: true });
                      return;
                    }

                    const targetId = selectedQuizIdForEdit || loaderData.quiz?.id;
                    const isDuplicate = loaderData.quizzes.some(
                      (q: any) =>
                        (categoryModal === "create" || q.id !== targetId) &&
                        q.title.trim().toLowerCase() === trimmedTitle.toLowerCase()
                    );

                    if (isDuplicate) {
                      setQuizNameError("This quiz name already exists.");
                      return;
                    }

                    if (categoryModal === "create") {
                      submit(
                        { intent: "create_quiz", title: categoryTitleInput },
                        { method: "POST" }
                      );
                    } else {
                      if (!targetId) return;
                      fetcher.submit(
                        { intent: "update_quiz", id: targetId, title: categoryTitleInput },
                        { method: "POST" }
                      );
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 transition-colors"
                >
                  {categoryModal === "create" ? "Create" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ViewQuizModal
        open={viewModalOpen}
        quiz={viewQuiz}
        onClose={() => {
          setViewModalOpen(false);
          setViewQuiz(null);
        }}
      />
    </s-page>
  );
}
