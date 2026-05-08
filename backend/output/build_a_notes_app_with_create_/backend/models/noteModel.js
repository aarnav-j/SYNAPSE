class Note {
  constructor(id, title, content) {
    this.id = id;
    this.title = title;
    this.content = content;
  }
}

class NoteModel {
  constructor() {
    this.notes = [];
    this.nextId = 1;
  }

  getAllNotes() {
    return this.notes;
  }

  getNoteById(id) {
    return this.notes.find(note => note.id === id);
  }

  createNote(title, content) {
    const note = new Note(this.nextId, title, content);
    this.notes.push(note);
    this.nextId++;
    return note;
  }

  updateNote(id, title, content) {
    const note = this.getNoteById(id);
    if (note) {
      note.title = title;
      note.content = content;
      return note;
    }
    return null;
  }

  deleteNote(id) {
    const index = this.notes.findIndex(note => note.id === id);
    if (index !== -1) {
      this.notes.splice(index, 1);
      return true;
    }
    return false;
  }
}

module.exports = NoteModel;