/**
*	FileSystem of web.fs
**/
define('webfs/fs/util', function () {
	function urlParse (url) {
		var path = [];
		_.each(url.split('/'), function (item) {
			if (item=='..') path.pop();
			else if (item !== '.') path.push(item);
		});
		return path.join('/');
	}
	function suffix (filename) {
		var namefrag = filename.toLowerCase().split('.'),
			suf = namefrag.length > 1 ? namefrag.pop() : '';
		return suf;
	}
	return {
		"urlParse": urlParse,
		"suffix" : suffix
	}
});
/**
*	DOM Manual for webfs/ui
**/
define('webfs/ui/dom', function () {
	var conf = {
		'del_icon_sel' : '.fs-icon-opt'
	}
	return {
		'showDelIcon' : function (container) {
			$(container).find(conf.del_icon_sel).css('visibility', 'visible');
		},
		'hideDelIcon' : function (container) {
			$(container).find(conf.del_icon_sel).css('visibility', 'hidden');
		}
	}
});
define('webfs/fs',["when", 'webfs/fs/util'], function (when, util) {

	var _requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem,
		Blob_Object = window.Blob;
	var config = {
			CREATE_ENTRY_OPTIONS : {
				create : true,
				exclusive : true
			},
			READ_ENTRY_OPTIONS : {
				create : false,
				exclusive : false
			},
			CREATE_OVERRIDE_ENTRY_OPTIONS : {
				create : true,
				exclusive : false
			}
		}
		, _this = {};

	_this._fsInstance = null;
	_this._cacheDirectories = {};
	//Peroperties
	var errorCodeMap = {
			'1' : 'NOT_FOUND_ERR',
			'2' : 'SECURITY_ERR',
			'3' : 'ABORT_ERR',
			'4' : 'NOT_READABLE_ERR',
			'5' : 'ENCODING_ERR',
			'6' : 'NO_MODIFICATION_ALLOWED_ERR',
			'7' : 'INVALID_STATE_ERR',
			'8' : 'SYNTAX_ERR',
			'9' : 'INVALID_MODIFICATION_ERR',
			'10' : 'QUOTA_EXCEEDED_ERR',
			'11' : 'TYPE_MISMATCH_ERR'
	},
		phonegapErrorCodeMap = {
			'1' : 'NOT_FOUND_ERR',
			'2' : 'SECURITY_ERR',
			'3' : 'ABORT_ERR',
			'4' : 'NOT_READABLE_ERR',
			'5' : 'ENCODING_ERR',
			'6' : 'NO_MODIFICATION_ALLOWED_ERR',
			'7' : 'INVALID_STATE_ERR',
			'8' : 'SYNTAX_ERR',
			'9' : 'INVALID_MODIFICATION_ERR',
			'10' : 'QUOTA_EXCEEDED_ERR',
			'11' : 'TYPE_MISMATCH_ERR',
			'12' : 'PATH_EXISTS_ERR'
		}
	// var deffered = when.deffer();
	/*Directory Cache*/
	function cacheDirectory (directory, entries) {
		_this._cacheDirectories[util.urlParse(directory.fullPath)] = entries;
	}
	function getCacheDirectory (directory) {
		return _this._cacheDirectories[util.urlParse(directory.fullPath)];
	}
	function removeCacheDirectory (directory) {
		_this._cacheDirectories[util.urlParse(directory.fullPath)] = null;
	}
	function opendir (directory, success, error) {
		if (directory.isDirectory) {
			// if (getCacheDirectory(directory)) {
			// 	success(getCacheDirectory(directory));
			// 	return;
			// }
			directory.createReader({}).readEntries(function (entries) {
				// cacheDirectory(directory, entries);
				success(entries)
			}, error);
		}
		else {
			error && error("Not a directory entry !");
		}
	}
	//##########################################################################

	//create a file
	function link (filename, cwd, success, error) {
		cwd.getFile(filename, config.CREATE_ENTRY_OPTIONS, success, error)
	}
	// create a directory
	function mkdir (directoryname, cwd, success, error) {
		cwd.getDirectory(directoryname, config.CREATE_ENTRY_OPTIONS, success, error);
	}
	// delete a file
	function unlink (filename, cwd, success, error) {
		readfile(filename, cwd, function (file) {
			file.remove(success, error);
		}, error);
	}
	// get a file
	function readfile (filename, cwd, success, error) {
		cwd.getFile(filename, config.READ_ENTRY_OPTIONS, success, error);
	}
	// get a directory
	function readdir (directoryname, cwd, success , error ) {
		cwd.getDirectory(directoryname, config.READ_ENTRY_OPTIONS, success, error);
	}
	// remove a directory -r
	function rmdir (directoryname, cwd, success, error) {
		readdir(directoryname, cwd, function (directory) {
			directory.removeRecursively(success, error);
		}, error);
	}
	// create a file and write conent
	function writefile (filename, cwd, content, success , error) {
		link(filename, cwd, function (file) {
			file.createWriter(function(fileWriter) {
                fileWriter.onwriteend = function(e) {
                    success(file);
                };

                fileWriter.onerror = function(e) {
                    error('Write failed: ' + e.toString());
                };
                try {
                	fileWriter.write(new Blob([content], {type: "text/plain;charset=UTF-8"}));
                } catch (e) {
					//Runing Good in Phonegap
					fileWriter.write(content);
                }

            }, error);

		} , error);
	}
	/**
	*	Open a dir . return entries
	**/
	function opendir (directory, success, error) {
		if (directory.isDirectory) {
			directory.createReader({}).readEntries(function (entries) {
				success(entries)
			}, error);
		}
		else {
			error && error("Not a directory entry !");
		}
	}
	/**
	*	Open a file
	**/
	function openfile (file, encoding, success, error) {

		var reader = new FileReader();
		if (file.isFile) {
			reader.readAsText(file, encoding);
			reader.onload = success;
  			reader.onerror = error;
		}
		else {
			error && error("Not a File entry !");
		}
	}
	/**
	*	Rquest FileSystem
	*	Use singleton Parttern
	*	@param storageType <TEMPORARY, PERSISTENT>
	**/
	function filesystem (storageType, success, error) {
		if ( !_this._fsInstance ) {
			_requestFileSystem(storageType, 1024 * 1024, function (fs) {

				_this._fsInstance = fs;
				success(_this._fsInstance);

			}, error);
			/* PC persistent storage*/
			// window.webkitStorageInfo.requestQuota(PERSISTENT, 1024*1024, function(grantedBytes) {
			//   window.webkitRequestFileSystem(PERSISTENT, grantedBytes, success, error); 
			// }, error);
		} else callback(_this._fsInstance);
	}

	return {
		"link" 			: link,
		"mkdir" 		: mkdir,
		"unlink" 		: unlink,
		"rmdir" 		: rmdir,
		"readfile" 		: readfile,
		"readdir" 		: readdir,
		"openfile" 		: openfile,
		"opendir" 		: opendir,
		"writefile" 	: writefile,
		'filesystem' 	: filesystem,
		"errorCodeMap" 	: errorCodeMap,
		"phonegapErrorCodeMap" : phonegapErrorCodeMap
	};
});

/**
*	UI of web.fs
**/
define('webfs/ui', 
		['webfs/fs', 'util/strRender', 'webfs/ui/dom', 'webfs/fs/util'], 
			function (webfs, strRender, webdom, util) {
				
	var _this = {}, //custom scope

		conf = {
			'MAX_FILE_NAME_LENGTH' : 8
		}

	_this._cwds = {};
	_this._root = '';
	_this._delIconVisi = {};

	// ICON Item HTML Template
	var  iconHtml = "<div data-type='@{fileType}' data-path='@{path}' data-event='icon-event' class='fs-icon @{iconType}' >"
					+ "<div data-event='icon-event' class='fs-icon-img @{iconClass}'></div>"
				 	+ "<a data-event='icon-event' class='fs-icon-name'>@{name}</a>"
				 	+ "<button data-event='icon-del' class='fs-icon-opt @{visibleClass}'></button>"
				 	+ "</div>";

	// ROOT and Back Item HTML Template
	var  backIconHtml = "<div data-type='@{fileType}' data-path='@{path}' data-event='icon-event' class='fs-icon @{iconType}' >"
					  + "<div data-event='icon-event' class='fs-icon-img'></div>"
				 	  + "<a data-event='icon-event' class='fs-icon-name'>@{name}</a>"
				 	  + "</div>";

	function setCwd (cwd, container) {
		_this._cwds[container] = cwd;
	}
	function getCwd (container) {
		return _this._cwds[container];
	}
	function errorHanlder (error, msg) {
		if (error) return error;
		return function (e) {
			console.log(msg);
			if (typeof e == 'string') throw new Error(e);
			else console.log('Error : ' + e.code);
		}
	}

	//初始化文件的打开事件操作
	function initFileOperation (eventType, container, error) {
		var handle;
		switch (eventType) {
			case 'click':
			case 'touchstart': 
				handle = function (e) {
					var $tar = $(e.target)
						, $parent;
					if ($tar.data('path')) $parent = $tar;
					else $parent = $tar.parent();

					if ($tar.data('event') !== "icon-event") return;
					if ($parent.data('type') === 'directory') {
						if ($parent.data('path') === '.') return;
						renderDirectorPath($parent.data('path'), container, null, error);
					} else {
						try {
							window.open(getCwd(container).toURL()+ '/' + $parent.data('path'),'view:file', 'resize=yes,scrollbar=yes,status=yes')
						} catch (e) {
							console.log(e);
							window.open(getCwd(container).toURL()+ '/' + $parent.data('path'),'view:file')
						}
						
					}
				};
				break;
		}
		$(container).on(eventType, handle);
	}

	//删除文件的事件操作
	function initIconDel (eventType, container, error) {

		var delBtnSel = '.fs-icon-opt';

		var handle = function (e) {

			var $optBtn = $(e.target),
				$parent = $optBtn.parent();

			if ($optBtn.data('event') !== "icon-del") return;

			webfs[$parent.data('type') === 'file' ? 'unlink' : 'rmdir'](
					$parent.data('path'), getCwd(container)
					, function () {
						
						$parent.animate({
						  "height" : 1,
						  "opacity" : 0.1
						}, {
							duration : 300,
							easing : 'ease-out',
							"complete" : function () {
								$parent.remove();
							}
						});
					}
					, errorHanlder(error))
		}

		$(container).on( eventType, delBtnSel, handle);
	}
	//显示删除按钮
	function showDelStatus (container) {
		if ( _this._delIconVisi[container] )  {

			_this._delIconVisi[container] = false;
			webdom.hideDelIcon(container);
		}
		else {
			_this._delIconVisi[container] = true;
			webdom.showDelIcon(container);
		}
	}
	//创建一个目录
	function mkdir (directoryname, container, success, error) {
		webfs.mkdir(directoryname, getCwd(container), function (file) {
			insertFileDOM(container, file);
			success && success();
		}, errorHanlder(error, 'UI:mkdir / FS:mkdir'));
	}
	//创建一个文件
	function writeFile (filename, content, container, success, error) {
		webfs.writefile(filename, getCwd(container), content, function (file) {
			insertFileDOM(container, file);
			success && success();
			
		}, errorHanlder(error, 'UI:writeFile / FS:writefile'));
	}
	//插入一个文件项目DOM
	function insertFileDOM (container, file) {
		document.body.scrollTop = document.body.scrollHeight;
		var contElem = $(container)[0]
			, fileType = file.isDirectory ? 'directory' : 'file'
			, iconType = file.isDirectory ? 'fs-icon-folder' : 'fs-icon-file'
			, name = file.name
			, iconClass = util.suffix(file.name).length > 0 && !file.isDirectory ? ' fs-icon-type-' + util.suffix(file.name) : ''
			, html = strRender.replace({
				"fileType" : fileType,
				"name" : name,
				"iconType" : iconType,
				"iconClass" : iconClass,
				"path" : name,
				"visibleClass" : _this._delIconVisi[container] ? '' : 'fs-visi-hide'
			}, iconHtml);
		$(container).append(html);
	}
	//渲染根目录API，也是webfs的启动函数
	function renderRoot(type, container, success, error) {
		webfs.filesystem(type,
			function(fs) {
				_this._root = fs.root.toURL();
				setCwd(fs.root, container);
				webfs.opendir(fs.root, 
					function (entries) {
						renderDirector(entries, container, success);
					}
				);
			},
		errorHanlder(error, 'UI:renderRoot / FS:filesystem'));
	}
	//渲染一个目录路径API，可用于打开子目录
	function renderDirectorPath (path, container, success, error) {
		if (path === getCwd(container).toURL()) path = './';
		window.timeDate = new Date();
		webfs.readdir(path, getCwd(container), function (entry) {
			if (entry.isDirectory) {
				setCwd(entry, container);
				webfs.opendir(entry, 
					function(entries) {
						renderDirector(entries, container, success);
					},
				errorHanlder(error, 'UI:renderDirectorPath / FS:opendir'));
			}
		}, errorHanlder(error, 'UI:renderDirectorPath / FS:readdir'))
	}
	//渲染目录
	function renderDirector (entries, container, success) {
		//render 目录前先把删除按钮状态设为隐藏
		_this._delIconVisi[container] = false;

		var html = ""
			, iconContent
			, parentPath
			, rootname
			, rootpath
			, iconType;

		if ( util.urlParse(getCwd(container).toURL()) !== util.urlParse(_this._root)) {
			rootname = '返回上一级';
			rootpath = '..';
			iconType = 'fs-icon-back';
		}
		else {
			rootname = '根目录';
			rootpath = '.';
			iconType = 'fs-icon-back fs-icon-root';
		}
		html += strRender.replace({
				"fileType" : 'directory',
				"name" : rootname,
				"iconType" : iconType,
				"path" : rootpath
			}, backIconHtml);

		_.each(entries, function (item, index) {

			var fileType = item.isDirectory ? 'directory' : 'file',
				iconType = item.isDirectory ? 'fs-icon-folder' : 'fs-icon-file',
				name = item.name,
				iconClass = util.suffix(name).length > 0 && !item.isDirectory ? ' fs-icon-type-' + util.suffix(name) : '';

			iconContent =  strRender.replace({
						"fileType" : fileType,
						"name" : name,
						"iconType" : iconType,
						"iconClass" : iconClass,
						"path" : name,
						"visibleClass" : _this._delIconVisi[container] ? '' : 'fs-visi-hide'
					}, iconHtml)
			html += iconContent;
		});
		$(container).html( html );
		
		success && success(entries);
	}

	//public methods
	return {
		//event
		"initFileOperation" 	: initFileOperation,
		// "initCreate" 			: initCreate,
		// "initCreateDirectory" 	: initCreateDirectory,
		"initIconDel" 			: initIconDel,
		//render
		"renderRoot" 			: renderRoot,
		"renderDirectorPath" 	: renderDirectorPath,
		"renderDirector" 		: renderDirector,
		//method
		"mkdir" 				: mkdir,
		"writeFile" 			: writeFile,
		"showDelStatus" 		: showDelStatus
	}
});

/**
*	WE
**/
define('webfs',['webfs/fs', 'webfs/ui'], function (webfs, webui) {
	return {
		'webfs' : webfs,
		'webui' : webui
	}
});
