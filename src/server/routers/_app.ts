import { router } from "../trpc/trpc";
import { todosRouter } from "./todos";
import { listsRouter } from "./lists";

export const appRouter = router({
  todos: todosRouter,
  lists: listsRouter,
});

export type AppRouter = typeof appRouter;
