function validateTitle(title) {
  if (typeof title !== 'string' || title.trim() === '') {
    throw new Error('Title must be a non-empty string');
  }
}

function validateCompleted(completed) {
  if (typeof completed !== 'boolean') {
    throw new Error('Completed must be a boolean');
  }
}

function validateTodo(data) {
  try {
    validateTitle(data.title);
    validateCompleted(data.completed);
  } catch (error) {
    throw error;
  }
}

module.exports = { validateTodo };