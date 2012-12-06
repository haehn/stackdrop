// (c) Daniel Haehn, MIT license

// VIEWER SETTINGS
_VIEW_ = {
  slice: -1,
  mode: 'header',
  current_ifd: null,
  stack_added: false,
  cache_size: 20,
  old_cache_size: 20,
  '3d_opacity': 10,
  queue: null
};


// TIFF file object
_TIFF_ = {
  'little_endian': true,
  'magic_number': -1,
  'ifd': []
};

// TIFF IFD object
_TIFF_IFD_ = function() {

  this._offset = -1;
  this._count = -1;
  
};

// tags
_TIFF_TAGS = {
  'NEW_SUBFILE_TYPE': 254,
  'IMAGE_WIDTH': 256,
  'IMAGE_LENGTH': 257,
  'BITS_PER_SAMPLE': 258,
  'COMPRESSION': 259,
  'PHOTO_INTERP': 262,
  'IMAGE_DESCRIPTION': 270,
  'STRIP_OFFSETS': 273,
  'ORIENTATION': 274,
  'SAMPLES_PER_PIXEL': 277,
  'ROWS_PER_STRIP': 278,
  'STRIP_BYTE_COUNT': 279,
  'X_RESOLUTION': 282,
  'Y_RESOLUTION': 283,
  'PLANAR_CONFIGURATION': 284,
  'RESOLUTION_UNIT': 296,
  'SOFTWARE': 305,
  'DATE_TIME': 306,
  'ARTEST': 315,
  'HOST_COMPUTER': 316,
  'PREDICTOR': 317,
  'COLOR_MAP': 320,
  'TILE_WIDTH': 322,
  'SAMPLE_FORMAT': 339,
  'JPEG_TABLES': 347,
  'METAMORPH1': 33628,
  'METAMORPH2': 33629,
  'IPLAB': 34122,
  'NIH_IMAGE_HDR': 43314,
  // private tag registered with Adobe
  'META_DATA_BYTE_COUNTS': 50838,
  // private tag registered with Adobe
  'META_DATA': 50839

};

function main(files) {

  // hide the box
  document.querySelector('#dropzone').style.display = 'none';
  
  // show instructioms
  document.querySelector('#instructions').style.display = 'block';
  
  // show loading indicator
  document.querySelector('#loading').style['display'] = 'block';
  
  // create the XTK renderer
  ren3d = new X.renderer3D();
  ren3d.init();
  // .. and register the onKey callback
  ren3d.interactor.onKey = onKey;
  
  ren3d.render();
  
  // var files = document.getElementById('files').files;
  
  slicer = new FileSlicer(files[0]);
  
  // register the callback
  slicer.done = function(data) {

    parse(slicer, data);
    
  };
  
  // scan the first 8 bytes of the TIFF file
  slicer.scan(8);
  
}

function parse(slicer, bytes) {

  // initialize the scanner with the bytes
  var scanner = new Scanner(bytes);
  scanner._littleEndian = _TIFF_['little_endian'];
  
  //
  // TIFF parser
  // implemented based on the TIFF6 specs
  // http://partners.adobe.com/public/developer/en/tiff/TIFF6.pdf
  //
  
  if (_VIEW_.mode == 'header') {
    
    //
    // THE HEADER
    //  
    
    var _byteorder = scanner.scan('ushort');
    // propagate the endianness to the scanner
    _TIFF_['little_endian'] = scanner._littleEndian = (_byteorder == 0x4949);
    
    _TIFF_['magic_number'] = scanner.scan('ushort');
    // the magicnumber has to be 42
    if (_TIFF_['magic_number'] != '42') {
      throw new Error('Invalid TIFF file. Magicnumber: ',
          _TIFF_['magic_number']);
    }
    
    // the image file directory byte offset
    var _ifd_offset = scanner.scan('uint');
    
    // now let's jump to the offset and scan the ifd
    slicer.jumpTo(_ifd_offset);
    _VIEW_.mode = 'ifd_probe';
    slicer.scan(2);
    
  } else if (_VIEW_.mode == 'ifd_probe') {
    
    //
    // THE IFD HEADER
    //    
    
    // create a new IFD
    _VIEW_.current_ifd = new _TIFF_IFD_();
    
    _VIEW_.current_ifd._count = scanner.scan('ushort');
    
    _VIEW_.mode = 'ifd';
    slicer.scan(_VIEW_.current_ifd._count * 12 + 4);
    
  } else if (_VIEW_.mode == 'ifd') {
    
    //
    // THE IFD CONTENT
    //
    for ( var i = -1; i < _VIEW_.current_ifd._count; i++) {
      
      var _identifier = scanner.scan('ushort');
      
      var _field = scanner.scan('ushort');
      
      var _count = scanner.scan('uint');
      
      var _value_type = 'uint';
      var _byte_size = -1;
      
      switch (_field) {
      
      case 1:
      case 2:
        _value_type = 'uchar';
        _byte_size = 1;
        break;
      case 3:
        _value_type = 'ushort';
        _byte_size = 2;
        break;
      case 4:
        _value_type = 'uint';
        _byte_size = 4;
        break;
      default:
      }
      
      // check if we have a value or a value location
      var _value = null;
      if (_count * _byte_size > 4) {
        
        // this is a value location
        _value = 'SOMEWHERE_ELSE';
        
      } else {
        _value = scanner.scan(_value_type, _count);
      }
      
      scanner.jumpTo(i * 12 + 12);
      
      for (tag in _TIFF_TAGS) {
        
        if (_TIFF_TAGS[tag] == _identifier) {
          
          // add it to the dictionary
          _VIEW_.current_ifd[tag] = _value;
          
        }
        
      }
      
    }
    
    // push the current ifd to our tiff file
    _TIFF_.ifd.push(_VIEW_.current_ifd);
    
    scanner.jumpTo(_VIEW_.current_ifd._count * 12);
    var _next_ifd = scanner.scan('uint');
    
    if (_next_ifd == 0) {
      
      box = new X.object();
      box.points = new X.triplets(72);
      box.normals = new X.triplets(72);
      box.type = 'LINES';
      var _x = _VIEW_.current_ifd['IMAGE_WIDTH'] / 2;
      var _y = _VIEW_.current_ifd['IMAGE_LENGTH'] / 2;
      var _z = _TIFF_.ifd.length / 2;
      box.points.add(_x, -_y, _z);
      box.points.add(-_x, -_y, _z);
      box.points.add(_x, _y, _z);
      box.points.add(-_x, _y, _z);
      box.points.add(_x, -_y, -_z);
      box.points.add(-_x, -_y, -_z);
      box.points.add(_x, _y, -_z);
      box.points.add(-_x, _y, -_z);
      box.points.add(_x, -_y, _z);
      box.points.add(_x, -_y, -_z);
      box.points.add(-_x, -_y, _z);
      box.points.add(-_x, -_y, -_z);
      box.points.add(_x, _y, _z);
      box.points.add(_x, _y, -_z);
      box.points.add(-_x, _y, _z);
      box.points.add(-_x, _y, -_z);
      box.points.add(_x, _y, _z);
      box.points.add(_x, -_y, _z);
      box.points.add(-_x, _y, _z);
      box.points.add(-_x, -_y, _z);
      box.points.add(-_x, _y, -_z);
      box.points.add(-_x, -_y, -_z);
      box.points.add(_x, _y, -_z);
      box.points.add(_x, -_y, -_z);
      for ( var i = 0; i < 24; ++i) {
        box.normals.add(0, 0, 0);
      }
      ren3d.add(box);
      
      stack = new X.stack();
      stack._dimensions = [1, 1, _TIFF_.ifd.length];
      stack.borders = false;
      stack.lowerThreshold = 0;
      stack.opacity = 0.1;
      stack.upperThreshold = 100;
      stack.create_();
      
      // grab data of image 0
      _VIEW_.mode = 'ready';
      create_queue(Math.floor(_TIFF_.ifd.length / 2));
      process_queue();
      
    } else {
      
      slicer.jumpTo(_next_ifd);
      _VIEW_.mode = 'ifd_probe';
      slicer.scan(2);
      
    }
    
  } else if (_VIEW_.mode == 'data') {
    
    var _data = scanner.scan('uchar', bytes.byteLength);
    
    var s = new X.slice();
    s.texture._rawDataWidth = _VIEW_.current_ifd['IMAGE_WIDTH'];
    s.texture._rawDataHeight = _VIEW_.current_ifd['IMAGE_LENGTH'];
    s.texture._rawData = _data;
    s.visible = false;
    s._stack = stack;
    s.setup([0, 0, _CURRENT_SLICE - _TIFF_.ifd.length / 2], [0, 0, 1],
        [0, 1, 0], _VIEW_.current_ifd['IMAGE_WIDTH'],
        _VIEW_.current_ifd['IMAGE_LENGTH'], false);
    
    _VIEW_.mode = 'ready';
    stack.children[2].children[_CURRENT_SLICE] = s;
    stack.modified();
    
    if (!_VIEW_.stack_added) {
      
      // do this only once
      
      _VIEW_.stack_added = true;
      
      // the first slice is active
      stack.indexZ = _CURRENT_SLICE;
      _VIEW_.slice = _CURRENT_SLICE;
      
      ren3d.add(stack);
      ren3d.camera.position = [0, 0, 1500];
      addUI();
      
    }
    
    process_queue();
    
  }
  
}


function create_queue(n) {

  _VIEW_.queue = new Array();
  _VIEW_.queue.push(n);
  
  var i;
  for (i = 1; i < _VIEW_.cache_size; i++) {
    
    if (n + i >= stack.dimensions[2] || n - i < 0) {
      continue;
    }
    
    _VIEW_.queue.push(n + i);
    _VIEW_.queue.push(n - i);
    
  }
  
}

function process_queue() {

  if (_VIEW_.mode != 'ready') {
    
    // file reading is in progress
    return;
    
  }
  
  if (_VIEW_.queue.length == 0) {
    
    // nothing to do
    
    // hide loading indicator
    document.querySelector('#loading').style['display'] = 'none';
    
    return;
    
  }
  
  // show loading indicator
  document.querySelector('#loading').style['display'] = 'block';
  
  load_slice(_VIEW_.queue.shift());
  
}

function clear_cache(n) {

  // remove old slices
  var _slice = stack.children[2].children[n];
  ren3d.remove(_slice);
  
  // remove old slice from volume
  stack.children[2].children[n] = new X.slice();
  

  var i;
  for (i = 1; i < _VIEW_.old_cache_size; i++) {
    
    // console.log('removing ', n + i);
    
    // remove old slices
    var _slice = stack.children[2].children[n + i];
    ren3d.remove(_slice);
    
    // remove old slice from volume
    stack.children[2].children[n + i] = new X.slice();
    
    // console.log('removing ', n - i);
    
    // remove old slices
    _slice = stack.children[2].children[n - i];
    ren3d.remove(_slice);
    
    // remove old slice from volume
    stack.children[2].children[n - i] = new X.slice();
    
  }
  
  console.log('cleared cache');
  
}

function load_slice(n) {

  if (n < 0 || n >= stack.dimensions[2]) {
    return;
  }
  
  // grab the data for image n
  _VIEW_.current_ifd = _TIFF_['ifd'][n];
  _CURRENT_SLICE = n;
  
  _VIEW_.mode = 'data';
  slicer.jumpTo(_VIEW_.current_ifd['STRIP_OFFSETS']);
  slicer.scan(_VIEW_.current_ifd['STRIP_BYTE_COUNT']);
  
}


function onKey(e) {

  if (_VIEW_.mode != 'ready') {
    return;
  }
  
  stack.indexZ = Math.floor(stack.indexZ);
  
  stack.volumeRendering = false;
  
  if (e.keyCode == 90) {
    
    load_slice(stack.indexZ - _VIEW_.cache_size);
    
    // remove old slice from renderer
    var _slice = stack.children[2].children[stack.indexZ + _VIEW_.cache_size -
        1];
    ren3d.remove(_slice);
    
    // remove old slice from volume
    stack.children[2].children[stack.indexZ + _VIEW_.cache_size - 1] = new X.slice();
    
    // move down
    stack.indexZ--;
    
  } else if (e.keyCode == 88) {
    
    load_slice(stack.indexZ + _VIEW_.cache_size);
    
    // remove old slice from renderer
    var _slice = stack.children[2].children[stack.indexZ - _VIEW_.cache_size +
        1];
    ren3d.remove(_slice);
    
    // remove old slice from volume
    stack.children[2].children[stack.indexZ - _VIEW_.cache_size + 1] = new X.slice();
    
    // move up
    stack.indexZ++;
    
  }
  
  _VIEW_.slice = stack.indexZ;
  
}

function addUI() {

  // create the GUI
  var gui = new dat.GUI();
  
  var _sliceController = gui
      .add(_VIEW_, 'slice', 0, stack.dimensions[2] - 1, 1).listen();
  gui.add(stack, 'volumeRendering').listen();
  var _opacityController = gui.add(_VIEW_, '3d_opacity', 0, 100);
  var _cacheController = gui.add(_VIEW_, 'cache_size', 1, Math
      .floor((stack.dimensions[2] - 1) / 2), 1);
  gui.addFolder('Red');
  var _rLowerThreshold = gui.add(stack, '_rLowerThreshold', 0, 1);
  var _rUpperThreshold = gui.add(stack, '_rUpperThreshold', 0, 1);
  gui.addFolder('Green');
  var _gLowerThreshold = gui.add(stack, '_gLowerThreshold', 0, 1);
  var _gUpperThreshold = gui.add(stack, '_gUpperThreshold', 0, 1);
  gui.addFolder('Blue');
  var _bLowerThreshold = gui.add(stack, '_bLowerThreshold', 0, 1);
  var _bUpperThreshold = gui.add(stack, '_bUpperThreshold', 0, 1);
  
  _sliceController.onFinishChange(function(v) {

    stack.volumeRendering = false;
    
    var n = stack.indexZ;
    clear_cache(n);
    
    create_queue(Math.round(v));
    process_queue();
    stack.indexZ = Math.round(v);
    
  });
  
  _cacheController.onFinishChange(function(v) {

    stack.volumeRendering = false;
    
    var n = stack.indexZ;
    clear_cache(n);
    
    _VIEW_.cache_size = Math.round(v);
    create_queue(stack.indexZ);
    process_queue();
    
    _VIEW_.old_cache_size = _VIEW_.cache_size;
    
  });
  
  _opacityController.onChange(function(v) {

    if (v == 100) {
      stack.opacity = 1;
      return;
    }
    
    stack.opacity = v / 200;
    
  });
  
}
