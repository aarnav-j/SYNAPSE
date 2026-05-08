let todos = [
  { id: 1, text: 'Buy milk', completed: false },
  { id: 2, text: 'Walk the dog', completed: false },
];

const getTodos = () => {
  return todos;
};

const addTodo = (newTodo) => {
  const id = todos.length + 1;
  const todo = { id, ...newTodo };
  todos.push(todo);
  return todo;
};

const updateTodo = (id, updatedTodo) => {
  const index = todos.findIndex((todo) => todo.id === parseInt(id));
  if (index === -1) {
    throw new Error('Todo not found');
  }
  todos[index] = { ...todos[index], ...updatedTodo };
  return todos[index];
};

const deleteTodo = (id) => {
  const index = todos.findIndex((todo) => todo.id === parseInt(id));
  if (index === -1) {
    throw new Error('Todo not found');
  }
  todos.splice(index, 1);
};

module.exports = { getTodos, addTodo, updateTodo, deleteTodo };