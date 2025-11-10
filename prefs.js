import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';

import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';
import About from './helpers/about.js';

export default class MonkeytypeStreakPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings('org.gnome.shell.extensions.monkeybar');

        // ==================== Settings Page ====================
        const settingsPage = new Adw.PreferencesPage();
        settingsPage.set_title(_('Settings'));
        settingsPage.set_icon_name('preferences-system-symbolic');

        // Credentials Group
        const credentialsGroup = new Adw.PreferencesGroup();
        credentialsGroup.set_title(_('Monkeytype Credentials'));
        credentialsGroup.set_description(_('Enter your Monkeytype username and ApeKey'));

        const usernameRow = new Adw.EntryRow({
            title: _('Monkeytype Username'),
            text: settings.get_string('monkeytype-username') || ''
        });
        usernameRow.connect('notify::text', () => {
            settings.set_string('monkeytype-username', usernameRow.text);
        });
        credentialsGroup.add(usernameRow);

        const apeKeyRow = new Adw.PasswordEntryRow({
            title: _('Monkeytype ApeKey'),
            text: settings.get_string('monkeytype-apekey') || ''
        });
        apeKeyRow.connect('notify::text', () => {
            settings.set_string('monkeytype-apekey', apeKeyRow.text);
        });
        credentialsGroup.add(apeKeyRow);

        settingsPage.add(credentialsGroup);

        // Auto Update Group
        const refreshGroup = new Adw.PreferencesGroup();
        refreshGroup.set_title(_('Auto Update Settings'));

        const intervalRow = new Adw.ComboRow({
            title: _('Refresh Interval'),
            subtitle: _('How often to check for new typing activity?')
        });

        const intervals = [
            { value: 900, label: _('15 minutes') },
            { value: 1800, label: _('30 minutes') },
            { value: 3600, label: _('1 hour') },
            { value: 7200, label: _('2 hours') },
            { value: 14400, label: _('4 hours') },
            { value: 21600, label: _('6 hours') },
            { value: 43200, label: _('12 hours') },
            { value: 86400, label: _('24 hours') }
        ];

        const intervalModel = new Gtk.StringList();
        intervals.forEach(interval => intervalModel.append(interval.label));
        intervalRow.model = intervalModel;

        const currentInterval = settings.get_int('refresh-interval');
        let activeIndex = intervals.findIndex(interval => interval.value === currentInterval);
        if (activeIndex === -1) activeIndex = 5;
        intervalRow.selected = activeIndex;

        intervalRow.connect('notify::selected', () => {
            settings.set_int('refresh-interval', intervals[intervalRow.selected].value);
        });

        refreshGroup.add(intervalRow);
        settingsPage.add(refreshGroup);

        // Panel Position Group
        const positionGroup = new Adw.PreferencesGroup();
        positionGroup.set_title(_('Panel Position'));
        positionGroup.set_description(_('Customize the position of the extension in the panel'));

        const positionRow = new Adw.ComboRow({
            title: _('Location'),
            subtitle: _('Which section of the panel to use')
        });

        const positions = [
            { value: 0, label: _('Left') },
            { value: 1, label: _('Center') },
            { value: 2, label: _('Right') }
        ];

        const positionModel = new Gtk.StringList();
        positions.forEach(position => positionModel.append(position.label));
        positionRow.model = positionModel;

        const currentPosition = settings.get_enum('panel-position');
        positionRow.selected = currentPosition;

        positionRow.connect('notify::selected', () => {
            settings.set_enum('panel-position', positionRow.selected);
        });

        positionGroup.add(positionRow);

        const indexRow = new Adw.SpinRow({
            title: _('Index'),
            subtitle: _('Position within the chosen section (0 is leftmost)'),
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 20,
                step_increment: 1,
                page_increment: 5,
                value: settings.get_int('panel-index')
            })
        });

        indexRow.connect('notify::value', () => {
            settings.set_int('panel-index', indexRow.value);
        });

        positionGroup.add(indexRow);
        settingsPage.add(positionGroup);

        // Interaction Group
        const interactionGroup = new Adw.PreferencesGroup();
        interactionGroup.set_title(_('Interaction'));
        interactionGroup.set_description(_('Configure how you interact with the extension'));

        const rightClickActionRow = new Adw.ComboRow({
            title: _('Right-click action'),
            subtitle: _('What to open when right-clicking the extension')
        });

        const rightClickActions = [
            { value: 'profile', label: _('Open Profile') },
            { value: 'homepage', label: _('Open Homepage') }
        ];

        const rightClickModel = new Gtk.StringList();
        rightClickActions.forEach(action => rightClickModel.append(action.label));
        rightClickActionRow.model = rightClickModel;

        const currentAction = settings.get_string('right-click-action');
        const actionIndex = rightClickActions.findIndex(action => action.value === currentAction);
        rightClickActionRow.selected = actionIndex >= 0 ? actionIndex : 0;

        rightClickActionRow.connect('notify::selected', () => {
            settings.set_string('right-click-action', rightClickActions[rightClickActionRow.selected].value);
        });

        interactionGroup.add(rightClickActionRow);
        settingsPage.add(interactionGroup);

        // Info Group (Bottom)
        const settingsSpacer = new Adw.PreferencesGroup();
        settingsSpacer.set_vexpand(true);
        settingsPage.add(settingsSpacer);

        const infoGroup = new Adw.PreferencesGroup();
        infoGroup.set_vexpand(false);
        infoGroup.set_valign(Gtk.Align.END);

        const infoRow = new Adw.ActionRow({
            title: _('About ApeKeys'),
            subtitle: _('Generate an ApeKey from your Monkeytype account settings.')
        });

        const linkButton = new Gtk.LinkButton({
            label: _('Open Monkeytype Settings'),
            uri: 'https://monkeytype.com/account-settings?tab=apeKeys'
        });
        infoRow.add_suffix(linkButton);
        infoGroup.add(infoRow);
        settingsPage.add(infoGroup);

        // ==================== Display Page ====================
        const displayPage = new Adw.PreferencesPage();
        displayPage.set_title(_('Display'));
        displayPage.set_icon_name('video-display-symbolic');

        // General Display Group
        const displayGeneralGroup = new Adw.PreferencesGroup();
        displayGeneralGroup.set_title(_('General'));
        displayGeneralGroup.set_description(_('Configure how typing activity is displayed'));

        const daysToShowRow = new Adw.SpinRow({
            title: _('Days to show'),
            subtitle: _('Number of days to display in the top bar (1-7)'),
            adjustment: new Gtk.Adjustment({
                lower: 1,
                upper: 7,
                step_increment: 1,
                page_increment: 1,
                value: settings.get_int('days-to-show')
            })
        });

        daysToShowRow.connect('notify::value', () => {
            settings.set_int('days-to-show', daysToShowRow.value);
        });

        displayGeneralGroup.add(daysToShowRow);

        const highlightCurrentDayRow = new Adw.SwitchRow({
            title: _('Highlight current day'),
            subtitle: _('Add a white border around the current day\'s box')
        });
        highlightCurrentDayRow.set_active(settings.get_boolean('highlight-current-day'));
        highlightCurrentDayRow.connect('notify::active', () => {
            settings.set_boolean('highlight-current-day', highlightCurrentDayRow.get_active());
        });
        displayGeneralGroup.add(highlightCurrentDayRow);

        displayPage.add(displayGeneralGroup);

        // Week Display Group
        const weekGroup = new Adw.PreferencesGroup();
        weekGroup.set_title(_('Week Display'));

        const showWeekOnlyRow = new Adw.SwitchRow({
            title: _('Show current week\'s tests only'),
            subtitle: _('Display tests for the current week instead of the last N days')
        });
        showWeekOnlyRow.set_active(settings.get_boolean('show-current-week-only'));
        showWeekOnlyRow.connect('notify::active', () => {
            settings.set_boolean('show-current-week-only', showWeekOnlyRow.get_active());
        });
        weekGroup.add(showWeekOnlyRow);

        const weekStartRow = new Adw.ComboRow({
            title: _('Week starts on'),
            subtitle: _('Select which day the week begins')
        });

        const weekDays = [
            _('Sunday'),
            _('Monday'),
            _('Tuesday'),
            _('Wednesday'),
            _('Thursday'),
            _('Friday'),
            _('Saturday')
        ];

        const weekDayModel = new Gtk.StringList();
        weekDays.forEach(day => weekDayModel.append(day));
        weekStartRow.model = weekDayModel;
        weekStartRow.selected = settings.get_enum('week-start-day');

        weekStartRow.connect('notify::selected', () => {
            settings.set_enum('week-start-day', weekStartRow.selected);
        });

        weekStartRow.set_sensitive(showWeekOnlyRow.get_active());
        showWeekOnlyRow.connect('notify::active', () => {
            weekStartRow.set_sensitive(showWeekOnlyRow.get_active());
        });

        weekGroup.add(weekStartRow);
        displayPage.add(weekGroup);

        // Theme Group
        const themeGroup = new Adw.PreferencesGroup();
        themeGroup.set_title(_('Color'));

        const colorModeRow = new Adw.ComboRow({
            title: _('Mode'),
            subtitle: _('Choose between opacity-based or grade-based coloring')
        });

        const colorModes = [
            _('Opacity Mode'),
            _('Grade Mode')
        ];

        const colorModeModel = new Gtk.StringList();
        colorModes.forEach(mode => colorModeModel.append(mode));
        colorModeRow.model = colorModeModel;
        colorModeRow.selected = settings.get_enum('color-mode');

        colorModeRow.connect('notify::selected', () => {
            settings.set_enum('color-mode', colorModeRow.selected);
        });

        themeGroup.add(colorModeRow);

        const themeRow = new Adw.ComboRow({
            title: _('Theme'),
            subtitle: _('Select a color theme for typing activity visualization')
        });

        const themes = [
            { key: 'standard', label: _('Monkeytype') },
            { key: 'githubDark', label: _('GitHub Green') },
            { key: 'halloween', label: _('Halloween') },
            { key: 'teal', label: _('Teal') },
            { key: 'leftPad', label: _('@left_pad') },
            { key: 'dracula', label: _('Dracula') },
            { key: 'blue', label: _('Blue') },
            { key: 'panda', label: _('Panda 🐼') },
            { key: 'sunny', label: _('Sunny') },
            { key: 'pink', label: _('Pink') },
            { key: 'solarizedDark', label: _('Solarized Dark') },
            { key: 'solarizedLight', label: _('Solarized Light') }
        ];

        const themeModel = new Gtk.StringList();
        themes.forEach(theme => themeModel.append(theme.label));
        themeRow.model = themeModel;
        themeRow.selected = settings.get_enum('theme-name');

        themeRow.connect('notify::selected', () => {
            settings.set_enum('theme-name', themeRow.selected);
        });

        themeGroup.add(themeRow);
        displayPage.add(themeGroup);

        // Add pages to window
        window.add(settingsPage);
        window.add(displayPage);
        window.add(new About(this));
        
        window.set_title(_('MonkeyBar'));
        window.set_default_size(650, 750);
    }
}
