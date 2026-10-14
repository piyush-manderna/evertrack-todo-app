import TaskCard from './TaskCard';

export default function TaskList({ tasks, onComplete, onDelete, onEdit, onRestore, isFinished, isOverdue, hideDate }) {
  if (!tasks || tasks.length === 0) return null;

  return (
    <div className="task-list">
      {tasks.map(task => (
        <TaskCard
          key={task.id}
          task={task}
          onComplete={onComplete}
          onDelete={onDelete}
          onEdit={onEdit}
          onRestore={onRestore}
          isFinished={isFinished}
          isOverdue={isOverdue}
          hideDate={hideDate}
        />
      ))}
    </div>
  );
}
