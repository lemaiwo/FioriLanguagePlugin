sap.ui.define([
	"sap/ui/core/Component",
	"./service/ConfigService",
	"./state/ConfigState",
	"sap/m/MessageToast",
	"sap/ushell/resources",
	"sap/ushell/services/AppConfiguration",
	'sap/ushell/components/applicationIntegration/AppLifeCycle',
	"sap/ui/model/json/JSONModel"
], function (Component, ConfigService, ConfigState, MessageToast, resources, AppConfiguration, AppLifeCycle, JSONModel) {

	return Component.extend("be.wl.fiori.lang.Component", {

		metadata: {
			"manifest": "json"
		},

		init: function () {

			this.getModel("config").attachMetadataFailed(function () {
				this.setModel(new JSONModel({
					LanguageSet: [{
						Sptxt: "English",
						Sprsl: "EN"
					}, {
						Sptxt: "Dutch",
						Sprsl: "NL"
					}, {
						Sptxt: "French",
						Sprsl: "FR"
					}]
				}), "config");
				ConfigService.setModel();
				this.oConfigState = new ConfigState();
				this.oConfigState.getCurrentLanguage().then(function (sLangu) {
					this.showLanguageButton();
					this.setFioriLanguage(sLangu);
				}.bind(this));
			}, this);

			this.getModel("config").metadataLoaded().then(function () {
				ConfigService.setModel(this.getModel("config"));
				this.oConfigState = new ConfigState();
				this.oConfigState.getCurrentLanguage().then(function (sLangu) {
					this.showLanguageButton();
					this.setFioriLanguage(sLangu);
				}.bind(this));
			}.bind(this));
		},
		showLanguageButton: function () {
			return this._getRenderer().then(function (oRenderer) {
				this.oLanguageBtn = oRenderer.addHeaderItem({
					icon: "sap-icon://globe",
					tooltip: this.oConfigState.CurrentLanguage,
					press: this.openLanguagePopover.bind(this)
				}, true, false, ["home"]);
				return true;
			}.bind(this));
		},
		openLanguagePopover: function (oEvent) {
			if (!this._oPopover) {
				this._oPopover = sap.ui.xmlfragment("be.wl.fiori.lang.fragment.Language", this);
				this._oPopover.setModel(this.getModel("config"));
				this._oPopover.setModel(this.getModel("i18n"), "i18n");
				this._oPopover.setModel(this.oConfigState.getModel(), "state");
				this._oPopover.setBusyIndicatorDelay(0);
			}
			this._oPopover.openBy(oEvent.getSource());
		},
		onSelectNewLanguage: function (oEvent) {
			var oListItem = oEvent.getParameter("listItem");
			if (!oListItem) {
				return false;
			}
			var oBindingCtx = oListItem.getBindingContext();
			if (!oBindingCtx) {
				return false;
			}
			var sNewLangu = oBindingCtx.getProperty("Sprsl");
			if (!sNewLangu) {
				return false;
			}
			this._oPopover.setBusy(true);
			//to show busy indicator
			setTimeout(function () { // eslint-disable-line
				this.oConfigState.setCurrentLanguage(sNewLangu).then(function () {
					this._oPopover.getModel().refresh();
				}.bind(this));
				this.setFioriLanguage(sNewLangu);
				MessageToast.show(this.getResourceBundle().getText("langu_changed"));
				this._oPopover.setBusy(false);
				this._oPopover.close();
			}.bind(this), 10);
		},
		setFioriLanguage: function (sLangu) {
			if (this.oLanguageBtn) {
				this.oLanguageBtn.setTooltip(sLangu);
			}
			var oUIConfig = sap.ui.getCore().getConfiguration();
			oUIConfig.setLanguage(sLangu.toLowerCase());
			//fiori language
			resources.i18nModel = resources.getTranslationModel(sLangu.toLowerCase());
			resources.i18n = resources.i18nModel.getResourceBundle();

			this.updateShellTitle();
			this.updateDefaultGroupTranslation();

			this._oShellContainer.getRenderer().shellCtrl.getView().setModel(resources.i18nModel, "i18n");
			// AppConfiguration = new AppConfiguration.__proto__.constructor();
			//var appMetaData = AppConfiguration.getMetadata();
			// this._oShellContainer.getRenderer().shellCtrl.getView().oShellHeader.setModel(resources.i18nModel, "i18n");

			// var oLaunchPage = sap.ushell.Container.getService("LaunchPage");
			// oLaunchPage.getDefaultGroup().then(function (group) {
			// 	var title = oLaunchPage.getGroupTitle(group);

			// });
		},
		updateShellTitle: function () {
			var oShellUIService = AppLifeCycle.getShellUIService();
			// var oShellUIService = this._oShellContainer.getRenderer().shellCtrl.oShellUIService;
			oShellUIService.setTitle(resources.i18n.getText("homeBtn_tooltip"));
		},
		updateDefaultGroupTranslation: function () {
			var oDashboardManager = (sap.ushell.components.flp && sap.ushell.components.flp.launchpad.getDashboardManager()) || false;
			if (!oDashboardManager) {
				return;
			}
			var aGroups = oDashboardManager.getModel().getProperty("/groups");
			aGroups.map(function (oGroup) {
				if (oGroup.isDefaultGroup) {
					oGroup.title = resources.i18n.getText("my_group");
				}
				return oGroup;
			});
			oDashboardManager.getModel().setProperty("/groups", aGroups);
		},
		getResourceBundle: function () {
			return this.getModel("i18n").getResourceBundle();
		},

		/**
		 * Returns the shell renderer instance in a reliable way,
		 * i.e. independent from the initialization time of the plug-in.
		 * This means that the current renderer is returned immediately, if it
		 * is already created (plug-in is loaded after renderer creation) or it
		 * listens to the &quot;rendererCreated&quot; event (plug-in is loaded
		 * before the renderer is created).
		 *
		 *  @returns {object}
		 *      a jQuery promise, resolved with the renderer instance, or
		 *      rejected with an error message.
		 */
		_getRenderer: function () {
			var that = this,
				oDeferred = new jQuery.Deferred(),
				oRenderer;

			that._oShellContainer = jQuery.sap.getObject("sap.ushell.Container");
			if (!that._oShellContainer) {
				oDeferred.reject(
					"Illegal state: shell container not available; this component must be executed in a unified shell runtime context.");
			} else {
				oRenderer = that._oShellContainer.getRenderer();
				if (oRenderer) {
					oDeferred.resolve(oRenderer);
				} else {
					// renderer not initialized yet, listen to rendererCreated event
					that._onRendererCreated = function (oEvent) {
						oRenderer = oEvent.getParameter("renderer");
						if (oRenderer) {
							oDeferred.resolve(oRenderer);
						} else {
							oDeferred.reject("Illegal state: shell renderer not available after recieving 'rendererLoaded' event.");
						}
					};
					that._oShellContainer.attachRendererCreatedEvent(that._onRendererCreated);
				}
			}
			return oDeferred.promise();
		}
	});
});