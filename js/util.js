//
// PARSE UTILITY FUNCTIONS FROM XTK (http://goXTK.com)
// (MIT LICENSED, COPYRIGHT XTK DEVELOPERS <dev@goxtk.com>)
//


//
// A slicer for files to avoid loading everything in memory.
//
FileSlicer = function(file) {

  this._file = file;
  this._filePointer = 0;
  this._reader = new FileReader();
  this._reader.onloadend = this.scanDone.bind(this);
  
};

FileSlicer.prototype.done = function(data) {

  console.log('Please overload.' + data);
  
};

FileSlicer.prototype.jumpTo = function(position) {

  this._filePointer = position;
  
};

FileSlicer.prototype.scan = function(chunks) {

  if (typeof chunks == 'undefined') {
    chunks = 1;
  }
  
  var blob = this._file.slice(this._filePointer, this._filePointer + chunks);
  this._filePointer += chunks;
  this._reader.readAsArrayBuffer(blob);
  
};

FileSlicer.prototype.scanDone = function(e) {

  if (e.target.readyState == FileReader.DONE) {
    // activate the callback
    this.done(e.target.result);
  }
  
};


Scanner = function(data) {

  this._data = data;
  this._dataPointer = 0;
  this._nativeLittleEndian = new Int8Array(new Int16Array([1]).buffer)[0] > 0;
  this._littleEndian = true;
  
};

/**
 * Jump to a position in the byte stream.
 * 
 * @param {!number} position The new offset.
 */
Scanner.prototype.jumpTo = function(position) {

  this._dataPointer = position;
};

/**
 * Scan binary data relative to the internal position in the byte stream.
 * 
 * @param {!string} type The data type to scan, f.e.
 *          'uchar','schar','ushort','sshort','uint','sint','float'
 * @param {!number=} chunks The number of chunks to scan. By default, 1.
 */
Scanner.prototype.scan = function(type, chunks) {

  if (typeof chunks == 'undefined') {
    chunks = 1;
  }
  var _chunkSize = 1;
  var _array_type = Uint8Array;
  switch (type) {
  // 1 byte data types
  case 'uchar':
    break;
  case 'schar':
    _array_type = Int8Array;
    break;
  // 2 byte data types
  case 'ushort':
    _array_type = Uint16Array;
    _chunkSize = 2;
    break;
  case 'sshort':
    _array_type = Int16Array;
    _chunkSize = 2;
    break;
  // 4 byte data types
  case 'uint':
    _array_type = Uint32Array;
    _chunkSize = 4;
    break;
  case 'sint':
    _array_type = Int32Array;
    _chunkSize = 4;
    break;
  case 'float':
    _array_type = Float32Array;
    _chunkSize = 4;
    break;
  }
  // increase the data pointer in-place
  var _bytes = new _array_type(this._data.slice(this._dataPointer,
      this._dataPointer += chunks * _chunkSize));
  // if required, flip the endianness of the bytes
  if (this._nativeLittleEndian != this._littleEndian) {
    // we need to flip here since the format doesn't match the native endianness
    _bytes = this.flipEndianness(_bytes, _chunkSize);
  }
  if (chunks == 1) {
    // if only one chunk was requested, just return one value
    return _bytes[0];
  }
  // return the byte array
  return _bytes;
};

/**
 * Flips typed array endianness in-place. Based on
 * https://github.com/kig/DataStream.js/blob/master/DataStream.js.
 * 
 * @param {!Object} array Typed array to flip.
 * @param {!number} chunkSize The size of each element.
 * @return {!Object} The converted typed array.
 */
Scanner.prototype.flipEndianness = function(array, chunkSize) {

  var u8 = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
  for ( var i = 0; i < array.byteLength; i += chunkSize) {
    for ( var j = i + chunkSize - 1, k = i; j > k; j--, k++) {
      var tmp = u8[k];
      u8[k] = u8[j];
      u8[j] = tmp;
    }
  }
  return array;
};
