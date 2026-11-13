/**
 * Application Route Paths Constants
 */
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  REGISTER: '/register',

  // Dashboards
  DASHBOARD: '/dashboard',
  DASHBOARD_SUPER_ADMIN: '/dashboard/super-admin',
  DASHBOARD_IT_ADMIN: '/dashboard/it-admin',
  DASHBOARD_TRAINEE: '/dashboard/trainee',
  DASHBOARD_TASKS: '/dashboard/tasks',
  DASHBOARD_ZOOM: '/dashboard/zoom',

  // Feature Modules
  ASSETS: '/assets',
  ASSET_DETAIL: '/assets/:id',
  STOCK: '/stock',
  HELPDESK: '/helpdesk',
  NEW_TICKET: '/helpdesk/new',
  TICKET_DETAIL: '/helpdesk/:id',
  REPAIRS: '/repairs',
  REPAIR_DETAIL: '/repairs/:id',
  ZOOM: '/zoom',
  NEW_ZOOM: '/zoom/new',
  PUBLICATIONS: '/publications',
  TASKS_BOARD: '/tasks/board',
  TASKS_LIST: '/tasks/list',
  TASKS_CALENDAR: '/tasks/calendar',
  TASKS_MINE: '/tasks/mine',
  TASK_DETAIL: '/tasks/:id',
  USERS: '/users',
  AUDIT: '/audit',
};

export default ROUTES;

