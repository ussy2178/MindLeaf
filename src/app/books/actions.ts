"use server";

/**
 * Legacy re-exports from the new contents actions.
 * All functionality has moved to @/app/contents/actions.
 */
export {
  createContent as createBook,
  createNode,
  updateNode,
  updateNodePosition,
  createEdge,
  deleteEdge,
  deleteNode,
  updateContent as updateBook,
  deleteContent as deleteBook,
  searchContents as searchBooks,
  getNodesByContentId as getNodesByBookId,
  updateContentStatus,
  updateContentType,
} from "@/app/contents/actions";
