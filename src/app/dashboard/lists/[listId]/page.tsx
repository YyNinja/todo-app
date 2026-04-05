import { use } from "react";
import { ListDetail } from "@/components/list-detail";

export default function ListPage({
  params,
}: {
  params: Promise<{ listId: string }>;
}) {
  const { listId } = use(params);
  return <ListDetail listId={listId} />;
}
