// (c) Daniel Haehn, MIT license


/**
 * Initialize our dropzone.
 */
function initialize_dragndrop() {

  // drag enter and drag leave
  document.body.addEventListener("dragenter", on_drag_enter, false);
  document.body.addEventListener("dragleave", on_drag_leave, false);
  
  // on drop
  document.body.addEventListener("drop", on_drop, false);
  
};

/**
 * Callback whenever a file is pulled into the browser window.
 */
function on_drag_enter() {

  var _dropzone = document.getElementById('dropzone');
  _dropzone.style.borderColor = 'red';
  
};

/**
 * Callback whenever a file is moved out of the browser window.
 */
function on_drag_leave() {

  var _dropzone = document.getElementById('dropzone');
  _dropzone.style.borderColor = 'white';
  
};

/**
 * Callback whenever a file is released over the browser window.
 */
function on_drop(event) {

  // avoid further processing by the browser
  event.stopPropagation();
  event.preventDefault();
  
  // grab the file list
  var _filelist = event.dataTransfer.files;
  
  main(_filelist);
  
};

