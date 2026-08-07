import { GroupWorkspace } from "../workspace";

export default async function SplitPage({
  params,
}: {
  params: Promise<{ id: string; splitId: string }>;
}) {
  const { id, splitId } = await params;
  return <GroupWorkspace id={id} splitId={splitId} />;
}
