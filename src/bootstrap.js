require(['webfs', 'when', 'util/notice', 'util/strRender'], function (wfs, when, notice, strRender) {
	var webfs = wfs.webfs, webui = wfs.webui;
	webui.renderRoot(window.TEMPORARY, '#fileView', function () {
		webui.initFileOperation('click', '#fileView');
		webui.initCreate('click', '#fileView', '#addFile');
		webui.initCreateDirectory('click', '#fileView', '#addFoler');
		webui.initIconDel('click', '#fileView', '.fs-icon-opt');
		webui.initShowDeleteIcon('click', '#fileView', '#showDeleteIcon');
	});

})