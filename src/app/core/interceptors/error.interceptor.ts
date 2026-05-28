import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { NotificationService } from '../../services/notification.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const notificationService = inject(NotificationService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const message = getErrorMessage(error);
      notificationService.error('Request Failed', message);
      // Re-throw so the component's error handler also fires
      return throwError(() => error);
    })
  );
};

function getErrorMessage(error: HttpErrorResponse): string {
  if (error.status === 0) {
    return 'Network error. Please check your internet connection.';
  }
  if (error.status === 404) {
    return 'The requested resource was not found.';
  }
  if (error.status === 429) {
    return 'Too many requests. Please wait a moment and try again.';
  }
  if (error.status >= 500) {
    return 'Server error. Please try again later.';
  }
  return error.message ?? 'An unexpected error occurred.';
}
