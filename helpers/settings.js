export class ExtensionSettings {
    constructor(extension) {
        this._extension = extension;
        this._settings = extension.getSettings();
    }

    get monkeytypeUsername() {
        return this._settings.get_string('monkeytype-username') || '';
    }

    set monkeytypeUsername(value) {
        this._settings.set_string('monkeytype-username', value || '');
    }

    get monkeytypeApeKey() {
        return this._settings.get_string('monkeytype-apekey') || '';
    }

    set monkeytypeApeKey(value) {
        this._settings.set_string('monkeytype-apekey', value || '');
    }

    get refreshInterval() {
        return this._settings.get_int('refresh-interval');
    }

    set refreshInterval(value) {
        this._settings.set_int('refresh-interval', value);
    }

    get panelPosition() {
        return this._settings.get_enum('panel-position');
    }

    set panelPosition(value) {
        this._settings.set_enum('panel-position', value);
    }

    get panelIndex() {
        return this._settings.get_int('panel-index');
    }

    set panelIndex(value) {
        this._settings.set_int('panel-index', value);
    }

    get highlightCurrentDay() {
        return this._settings.get_boolean('highlight-current-day');
    }

    set highlightCurrentDay(value) {
        this._settings.set_boolean('highlight-current-day', value);
    }

    get showCurrentWeekOnly() {
        return this._settings.get_boolean('show-current-week-only');
    }

    set showCurrentWeekOnly(value) {
        this._settings.set_boolean('show-current-week-only', value);
    }

    get weekStartDay() {
        return this._settings.get_enum('week-start-day');
    }

    set weekStartDay(value) {
        this._settings.set_enum('week-start-day', value);
    }

    get themeName() {
        return this._settings.get_enum('theme-name');
    }

    set themeName(value) {
        this._settings.set_enum('theme-name', value);
    }

    get colorMode() {
        return this._settings.get_enum('color-mode');
    }

    set colorMode(value) {
        this._settings.set_enum('color-mode', value);
    }

    get daysToShow() {
        return this._settings.get_int('days-to-show');
    }

    set daysToShow(value) {
        this._settings.set_int('days-to-show', value);
    }

    get rightClickAction() {
        return this._settings.get_string('right-click-action');
    }

    set rightClickAction(value) {
        this._settings.set_string('right-click-action', value);
    }

    connectChanged(callback) {
        return this._settings.connect('changed', callback);
    }

    disconnectChanged(handlerId) {
        this._settings.disconnect(handlerId);
    }
}