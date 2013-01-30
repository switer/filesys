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
	function getDirectoryEntries (directory, success, error) {
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
	function link (filename, cwd, success, error) {
		cwd.getFile(filename, config.CREATE_ENTRY_OPTIONS, success, error)
	}
	function mkdir (directoryname, cwd, success, error) {
		cwd.getDirectory(directoryname, config.CREATE_ENTRY_OPTIONS, success, error);
	}
	function unlink (filename, cwd, success, error) {
		readfile(filename, cwd, function (file) {
			file.remove(success, error);
		}, error);
	}
	function readfile (filename, cwd, success, error) {
		cwd.getFile(filename, config.READ_ENTRY_OPTIONS, success, error);
	}
	function readdir (directoryname, cwd, success , error ) {
		cwd.getDirectory(directoryname, config.READ_ENTRY_OPTIONS, success, error);
	}
	function rmdir (directoryname, cwd, success, error) {
		readdir(directoryname, cwd, function (directory) {
			directory.removeRecursively(success, error);
		}, error);
	}
	function writefile(filename, cwd, content, success , error) {
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
					//Runing Good in Phonega
					fileWriter.write(content);
//                	success(file, 'error:blob');
                }

            }, error);

		} , error);
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
		"link" : link,
		"mkdir" : mkdir,
		"unlink" : unlink,
		"rmdir" : rmdir,
		"readfile" : readfile,
		"readdir" : readdir,
		// "getfile" : getfile,
		// "getdir" : getdir,
		// 'read' : read,
		"writefile" : writefile,
		'filesystem' : filesystem,
		getDirectoryEntries : getDirectoryEntries
	};
});

/**
*	UI of web.fs
**/
define('webfs/ui', 
		['webfs/fs', 'util/strRender', 'webfs/ui/dom', 'webfs/fs/util'], 
			function (webfs, strRender, webdom, util) {
				
	var _this = {},
		conf = {
			'MAX_FILE_NAME_LENGTH' : 8
		}
	_this._cwds = {};
	_this._root = '';
	_this._delIconVisi = {};

	var  iconHtml = "<div data-type='@{fileType}' data-path='@{path}' data-event='icon-event' class='fs-icon @{iconType}' >"
					+ "<div data-event='icon-event' class='fs-icon-img @{iconClass}'></div>"
				 	+ "<a data-event='icon-event' class='fs-icon-name'>@{name}</a>"
				 	+ "<button data-event='icon-del' class='fs-icon-opt @{visibleClass}'></button>"
				 	+ "</div>";

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
	function errorHanlder (msg) {
		return function (e) {
			console.log(msg);
			if (typeof e == 'string') throw new Error(e);
			else console.log(e);
		}
	}
	function wrapEvent (etype) {
		switch (etype) {
			case 'click':
			case 'touchstart': 
				etype = 'click touchstart';
				break;
		}
		return etype
	}
	function initFileOperation (eventType, container) {
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
						renderDirectorPath($parent.data('path'), container);
					} else {
						console.log(getCwd(container).toURL() + '/' + $parent.data('path'));
						// window.location.href = getCwd(container).toURL() + $parent.data('path');
						window.open(getCwd(container).toURL()+ '/' + $parent.data('path'),'view:file')
					}
				};
				break;
		}
		$(container).on(eventType, handle);
	}

	function initCreate (eventType, container ,selector) {
		var handle = function () {
			var random = parseInt(Math.random()*1000)%6;
			writeFile('temp_'+(new Date()).getTime() + ['.html','.mp3','.jpg','.txt', '.mp4', '.pdf'][random], '<html><head><title>123123</title></head><body>123123123213</body></html>', container)
		}
		$(selector).on(eventType, handle);
	}
	function initShowDeleteIcon (eventType, container, selector) {
		var handle = function () {
			if ( _this._delIconVisi[container] )  {

				_this._delIconVisi[container] = false;
				webdom.hideDelIcon(container);
			}
			else {
				_this._delIconVisi[container] = true;
				webdom.showDelIcon(container);
			}
		}
		$(document).on(eventType, selector, handle);

	}
	function initCreateDirectory (eventType, container , selector) {
		var handle = function () {
			mkdir('temp_'+(new Date()).getTime() + '/', container);
		}
		$(selector).on(eventType, handle);
	}
	function initIconDel (eventType, container , selector) {
		var handle = function (e) {
			var $optBtn = $(e.target),
				$parent = $optBtn.parent(); 
			var dataset = e.target.dataset;
				iconDateset = e.target.parentNode;
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
					, function (err) {
						console.log('error : ' , err)
					}
				)
		}
		$(container).on( eventType, selector, handle);
	}
	function mkdir (directoryname, container, success) {
		webfs.mkdir(directoryname, getCwd(container), function (file) {
			// renderDirectorPath(getCwd(container).toURL(), container)
			insertFileDOM(container, file);
			success && success();

		}, errorHanlder('UI:initCreateDirectory/FS:createFile:'));
	}
	function writeFile (filename, content, container, success) {
		webfs.writefile(filename, getCwd(container), content, function (file) {

			insertFileDOM(container, file);
			success && success();
			
		}, errorHanlder('UI:initCreate/FS:createFile:'));
	}
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
	function renderRoot(type, container, callback) {
		webfs.filesystem(type,
			function(fs) {
				_this._root = fs.root.toURL();
				setCwd(fs.root, container);
				webfs.getDirectoryEntries(fs.root, 
					function (entries) {
						renderDirector(entries, container, callback);
					}
				);
			},
		errorHanlder('requestFS:'));
	}
	function renderDirectorPath (path, container, callback) {
		if (path === getCwd(container).toURL()) path = './';
		window.timeDate = new Date();
		webfs.readdir(path, getCwd(container), function (entry) {
			if (entry.isDirectory) {
				setCwd(entry, container);
				webfs.getDirectoryEntries(entry, 
					function(entries) {
						renderDirector(entries, container, callback);
					},
				errorHanlder('UI:renderDirectorPath/FS:getDirectoryEntries:'));
			}
		}, errorHanlder('UI:renderDirectorPath/FS:readPathAsDirectory:'))
	}
	function renderDirector (entries, container, callback) {
		//render 目录前先把状态隐藏
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
		
		callback && callback(entries);
	}
	return {
		//event
		initFileOperation : initFileOperation,
		initCreate : initCreate,
		initCreateDirectory : initCreateDirectory,
		initIconDel : initIconDel,
		//render
		renderRoot : renderRoot,
		renderDirectorPath : renderDirectorPath,
		renderDirector : renderDirector,
		initShowDeleteIcon : initShowDeleteIcon
	}
});

/**
*
**/
define('webfs',['webfs/fs', 'webfs/ui'], function (webfs, webui) {
	return {
		'webfs' : webfs,
		'webui' : webui
	}
});
