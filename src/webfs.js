/**
*	FileSystem of web.fs
**/
define('webfs/fs',["when"], function (when) {

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
		, _this = this;

	this._fsInstance = null;
	// var deffered = when.deffer();
	function readURL(url) {
		console.log('in webfs : readURL');
	}
	/**
	*	Rquest FileSystem
	*	Use singleton Parttern
	**/
	function requestFS (success, error) {
		if ( !this._fsInstance ) {
//			this._fsInstance = _requestFileSystem(TEMPORARY, 1024 * 1024, success, error);
			this._fsInstance = _requestFileSystem(PERSISTENT, 1024 * 1024, success, error);
			// window.webkitStorageInfo.requestQuota(PERSISTENT, 1024*1024, function(grantedBytes) {

			//   window.webkitRequestFileSystem(PERSISTENT, grantedBytes, success, error); 
			// }, error);

		} else callback(this._fsInstance);
	}
	function getDirectoryEntries (directory, success, error) {
		if (directory.isDirectory) directory.createReader({}).readEntries(success, error);
		else {
			error && error("Not a directory entry !");
		}
	}
	function readPathAsDirectory (path, cwd, success, error) {
		cwd.getDirectory(path, config.READ_ENTRY_OPTIONS, success, error);
	}
	function raedPathAsFile (filename, cwd, success, error) {
		cwd.getFile(filename, config.READ_ENTRY_OPTIONS, success, error);
	}
	function createDirectory (directoryname, cwd, success, error) {
		cwd.getDirectory(directoryname, config.CREATE_ENTRY_OPTIONS, success, error);
	}
	function createFile (filename, cwd, content, success, error) {
		cwd.getFile(filename, config.CREATE_ENTRY_OPTIONS, function (file) {
            file.createWriter(function(fileWriter) {
				console.log('on writer');
				alert('on writer');
                fileWriter.onwriteend = function(e) {
                    success(file);
                };
                fileWriter.onerror = function(e) {
                    error('Write failed: ' + e.toString());
                };
				try {
//					var blob = new Blob_Object([content], {"type":'text/plain'});
					console.log(content);
					fileWriter.write(new Blob([content], {"type":'text/plain'}));
				} catch (e) {
					console.log(e);
				}
            }, error);
		}, error);
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

	function filesystem () {
		if ( !this._fsInstance ) {
			this._fsInstance = _requestFileSystem(TEMPORARY, 1024 * 1024, success, error);
		} else callback(this._fsInstance);
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
		requestFS : requestFS,
		readURL : readURL,
		createFile : createFile,
		createDirectory : createDirectory,
		getDirectoryEntries : getDirectoryEntries,
		readPathAsDirectory : readPathAsDirectory
	};
});
/**
*	UI of web.fs
**/
define('webfs/ui',['webfs/fs', 'util/strRender'], function (webfs, strRender) {
	var _this = this,
		conf = {
			'MAX_FILE_NAME_LENGTH' : 8
		}
	this._cwds = {};
	this._root = '';
	this._parentDerectories = {};

	var  iconHtml = "<div data-type='@{fileType}' data-path='@{path}' data-event='icon-event' class='fs-icon @{iconType}' >"
					+ "<div data-event='icon-event' class='fs-icon-img'></div>"
				 	+ "<a data-event='icon-event' class='fs-icon-name'>@{name}</a>"
				 	+ "<button data-event='icon-del' class='fs-icon-opt fs-disp-none'></button>"
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
			writeFile('temp_'+(new Date()).getTime() + '.html', '<html><head><title>123123</title></head><body>123123123213</body></html>', container)
		}
		$(selector).on(eventType, handle);
	}
	function initShowDeleteIcon (eventType, container, selector) {
		var handle = function () {
			$('.sui-icon-opt', container).removeClass('fs-disp-none');
		}
		$(selector).on(eventType, handle);
	}
	function initCreateDirectory (eventType, container , selector) {
		var handle = function () {
			webfs.mkdir('temp_'+(new Date()).getTime() + '/', getCwd(container), function () {
				renderDirectorPath(getCwd(container).toURL(), container)
			}, errorHanlder('UI:initCreateDirectory/FS:createFile:'));
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
						$parent.remove();
					}
					, function (err) {
						console.log('error : ' , err)
					}
				)
		}
		$(container).on( eventType, selector, handle);
	}
	function writeFile (filename, content, container, success) {
		webfs.writefile(filename, getCwd(container), content, function (file) {

			var contElem = $(container)[0]
				, fileType = file.isDirectory ? 'directory' : 'file'
				, iconType = file.isDirectory ? 'fs-icon-folder' : 'fs-icon-file'
				, name = file.name
				, html = strRender.replace({
					"fileType" : fileType,
//					"name" : name.length > conf.MAX_FILE_NAME_LENGTH ? name.slice(0, conf.MAX_FILE_NAME_LENGTH) + '...' : name,
					"name" : name,
					"iconType" : iconType,
					"path" : name
				}, iconHtml);

			$(container).append(html);
			document.body.scrollTop = document.body.scrollHeight;
			success && success();
		}, errorHanlder('UI:initCreate/FS:createFile:'));
	}
	function renderRoot(container, callback) {
		webfs.requestFS(
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
		webfs.readPathAsDirectory(path, getCwd(container), function (entry) {
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
		var html = "", iconContent;

		if ( getCwd(container).toURL() !== _this._root ) {
			html += strRender.replace({
				"fileType" : 'directory',
				"name" : '返回上一级',
				"iconType" : 'fs-icon-back',
				"path" : '..'
			}, iconHtml)
		}
		_.each(entries, function (item) {

			var fileType = item.isDirectory ? 'directory' : 'file',
				iconType = item.isDirectory ? 'fs-icon-folder' : 'fs-icon-file',
				name = item.name;
			iconContent =  strRender.replace({
						"fileType" : fileType,
//						"name" : name.length > conf.MAX_FILE_NAME_LENGTH ? name.slice(0, conf.MAX_FILE_NAME_LENGTH) + '...' : name,
						"name" : name,
						"iconType" : iconType,
						"path" : name
					}, iconHtml)

			html += iconContent;
		});
		$(container).html( html );
		callback && callback(entries);
	}
	function createIconDOM (params) {
		var frag = document.createDocumentFragment(),
			html = strRender.replace(params, iconHtml);
		frag.innerHTML = html;
		return frag;
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
