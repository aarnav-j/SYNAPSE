class TodoModel {
  constructor() {
    this.todos = [];
    this.idCounter = 1;
  }

  getTodos() {
    return this.todos;
  }

  getTodoById(id) {
    return this.todos.find((todo) => todo.id === parseInt(id));
  }

  createTodo(title, description) {
    const newTodo = {
      id: this.idCounter,
      title,
      description,
      completed: false,
    };
    this.todos.push(newTodo);
    this.idCounter++;
    return newTodo;
  }

  updateTodo(id, title, description) {
    const todo = this.getTodoById(id);
    if (todo) {
      todo.title = title;
      todo.description = description;
      return todo;
    }
    return null;
  }

  deleteTodo(id) {
    const index = this.todos.findIndex((todo) => todo.id === parseInt(id));
    if (index !== -1) {
      this.todos.splice(index, 1);
      return true;
    }
    return false;
  }
}

const todoModel = new TodoModel();
module.exports = todoModel;