import { useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { KanbanCard, type UnifiedPost } from "./KanbanCard";
import { Badge } from "../../../client/components/ui/badge";

interface KanbanBoardProps {
  posts: UnifiedPost[];
  onMovePost: (
    postId: string,
    postType: string,
    targetStatus: string
  ) => void;
  onViewDetail: (post: UnifiedPost) => void;
}

const COLUMNS = [
  { id: "draft", label: "Draft", color: "bg-slate-100 dark:bg-slate-800/50" },
  {
    id: "approved",
    label: "Approved",
    color: "bg-emerald-50 dark:bg-emerald-900/20",
  },
  {
    id: "scheduled",
    label: "Scheduled",
    color: "bg-amber-50 dark:bg-amber-900/20",
  },
  {
    id: "published",
    label: "Published",
    color: "bg-blue-50 dark:bg-blue-900/20",
  },
] as const;

function DroppableColumn({
  columnId,
  label,
  color,
  posts,
  onViewDetail,
  isOver,
}: {
  columnId: string;
  label: string;
  color: string;
  posts: UnifiedPost[];
  onViewDetail: (post: UnifiedPost) => void;
  isOver: boolean;
}) {
  const { setNodeRef } = useDroppable({ id: columnId });

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[400px] flex-1 flex-col rounded-xl border-2 transition-colors ${
        isOver ? "border-primary/50 ring-2 ring-primary/20" : "border-transparent"
      } ${color}`}
    >
      {/* Column header */}
      <div className="flex items-center justify-between px-4 py-3">
        <h3 className="text-sm font-semibold">{label}</h3>
        <Badge variant="secondary" className="text-xs">
          {posts.length}
        </Badge>
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-2 px-3 pb-3">
        <SortableContext
          items={posts.map((p) => p.id)}
          strategy={verticalListSortingStrategy}
        >
          {posts.map((post) => (
            <KanbanCard
              key={post.id}
              post={post}
              onViewDetail={onViewDetail}
            />
          ))}
        </SortableContext>

        {posts.length === 0 && (
          <div className="text-muted-foreground flex items-center justify-center rounded-lg border-2 border-dashed py-8 text-sm">
            No posts
          </div>
        )}
      </div>
    </div>
  );
}

export function KanbanBoard({
  posts,
  onMovePost,
  onViewDetail,
}: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overColumnId, setOverColumnId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const postsByStatus = COLUMNS.reduce(
    (acc, col) => {
      acc[col.id] = posts.filter((p) => p.status === col.id);
      return acc;
    },
    {} as Record<string, UnifiedPost[]>
  );

  const activePost = activeId
    ? posts.find((p) => p.id === activeId) ?? null
    : null;

  function findColumnForPost(postId: string): string | null {
    for (const col of COLUMNS) {
      if (postsByStatus[col.id]?.some((p) => p.id === postId)) {
        return col.id;
      }
    }
    return null;
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragOver(event: DragOverEvent) {
    const { over } = event;
    if (!over) {
      setOverColumnId(null);
      return;
    }

    const overId = String(over.id);

    // Check if dropping over a column directly
    const isColumn = COLUMNS.some((c) => c.id === overId);
    if (isColumn) {
      setOverColumnId(overId);
      return;
    }

    // Otherwise, dropping over a card -- find which column the card is in
    const columnId = findColumnForPost(overId);
    setOverColumnId(columnId);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    setOverColumnId(null);

    if (!over) return;

    const draggedPostId = String(active.id);
    const overId = String(over.id);

    // Determine which column was the target
    let targetColumn: string | null = null;

    // Check if we dropped on a column ID directly
    const isColumn = COLUMNS.some((c) => c.id === overId);
    if (isColumn) {
      targetColumn = overId;
    } else {
      // Dropped on a card -- find which column that card is in
      targetColumn = findColumnForPost(overId);
    }

    if (!targetColumn) return;

    // Find the original column for the dragged post
    const sourceColumn = findColumnForPost(draggedPostId);

    // Only trigger move if the column changed
    if (sourceColumn && sourceColumn !== targetColumn) {
      const draggedPost = posts.find((p) => p.id === draggedPostId);
      if (draggedPost) {
        onMovePost(draggedPostId, draggedPost.postType, targetColumn);
      }
    }
  }

  function handleDragCancel() {
    setActiveId(null);
    setOverColumnId(null);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => (
          <DroppableColumn
            key={col.id}
            columnId={col.id}
            label={col.label}
            color={col.color}
            posts={postsByStatus[col.id] || []}
            onViewDetail={onViewDetail}
            isOver={overColumnId === col.id}
          />
        ))}
      </div>

      {/* Drag overlay for visual feedback */}
      <DragOverlay>
        {activePost ? (
          <div className="w-[280px] rotate-3 opacity-90">
            <KanbanCard post={activePost} onViewDetail={() => {}} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
