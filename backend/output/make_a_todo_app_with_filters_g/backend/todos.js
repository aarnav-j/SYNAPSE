let todos = [
  { id: 1, text: 'Buy milk', completed: false },
  { id: 2, text: 'Walk the dog', completed: false },
  { id: 3, text: 'Do homework', completed: false }
];

let nextId = 4;

exports.addTodo = (req, res) => {
  const { text } = req.body;
  const newTodo = { id: nextId, text, completed: false };
  todos.push(newTodo);
  nextId++;
  res.json(newTodo);
};

exports.getTodos = (req, res) => {
  res.json(todos);
};

exports.editTodo = (req, res) => {
  const id = parseInt(req.params.id);
  const todo = todos.find((t) => t.id === id);
  if (todo) {
    todo.text = req.body.text;
    res.json(todo);
  } else {
    res.status(404).json({ error: 'Todo not found' });
  }
};

exports.completeTodo = (req, res) => {
  const id = parseInt(req.params.id);
  const todo = todos.find((t) => t.id === id);
  if (todo) {
    todo.completed = !todo.completed;
    res.json(todo);
  } else {
    res.status(404).json({ error: 'Todo not found' });
  }
};

exports.deleteTodo = (req, res) => {
  const id = parseInt(req.params.id);
  const index = todos.findIndex((todo) => todo.id === id);
  if (index !== -1) {
    todos.splice(index, 1);
    res.json({ message: 'Todo deleted successfully' });
  } else {
    res.status(404).json({ error: 'Todo not found' });
  }
};