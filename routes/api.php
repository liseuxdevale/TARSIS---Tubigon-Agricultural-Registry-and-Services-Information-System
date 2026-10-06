<?php

use App\Http\Controllers\Api\AnnouncementController;
use App\Http\Controllers\Api\AnnouncementCommentController;
use App\Http\Controllers\Api\AssistanceApplicationController;
use App\Http\Controllers\Api\AuditLogController;
use App\Http\Controllers\Api\ArchivedRecordController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BarangayController;
use App\Http\Controllers\Api\GeoLocationController;
use App\Http\Controllers\Api\InsuranceClaimController;
use App\Http\Controllers\Api\NotificationDeliveryController;
use App\Http\Controllers\Api\RegistrantController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\UserManagementController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/register', [AuthController::class, 'register']);
Route::get('/public/registrants/{registryNumber}/rsbsa-preview', [RegistrantController::class, 'rsbsaPreview']);
Route::get('/public/registrants/{registryNumber}', [RegistrantController::class, 'publicProfile']);
Route::get('/barangays', [BarangayController::class, 'index']);
Route::get('/announcements', [AnnouncementController::class, 'index']);
Route::middleware('jwt')->get('/announcements/visible', [AnnouncementController::class, 'index']);
Route::get('/announcements/{announcement}', [AnnouncementController::class, 'show']);
Route::get('/announcements/{announcement}/comments', [AnnouncementCommentController::class, 'index']);
Route::post('/announcements/{announcement}/comments', [AnnouncementCommentController::class, 'store']);
Route::post('/announcements/{announcement}/comments/{comment}/react', [AnnouncementCommentController::class, 'react']);

Route::middleware('jwt')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::get('/auth/activity', [AuthController::class, 'activity']);
    Route::post('/auth/avatar', [AuthController::class, 'updateAvatar']);
    Route::put('/auth/profile', [AuthController::class, 'updateProfile']);
    Route::put('/auth/password', [AuthController::class, 'updatePassword']);
    Route::get('/tracking/me', [RegistrantController::class, 'myTrackingProfile']);
    Route::get('/tracking/registrants/{registryNumber}', [RegistrantController::class, 'trackingProfile']);

    Route::get('/reports/dashboard', [ReportController::class, 'dashboard']);
    Route::get('/dashboard/super-admin', [ReportController::class, 'dashboard']);
    Route::get('/dashboard/sector-admin', [ReportController::class, 'dashboard']);
    Route::get('/dashboard/barangay-admin', [ReportController::class, 'dashboard']);
    Route::get('/dashboard/registrant', [ReportController::class, 'dashboard']);
    Route::get('/reports/export', [ReportController::class, 'export'])->middleware('role:super_admin,mao_staff,crop_head,fish_head,livestock_head,poultry_head');

    Route::get('/barangays/scoped', [BarangayController::class, 'index'])->middleware('role:super_admin,mao_staff,barangay_technical_staff,crop_head,fish_head,livestock_head,poultry_head');
    Route::get('/barangays/export', [BarangayController::class, 'export'])->middleware('role:super_admin,mao_staff');
    Route::put('/barangays/{barangay}', [BarangayController::class, 'update'])->middleware('role:super_admin');
    Route::apiResource('barangays', BarangayController::class)->except(['index'])->middleware('role:super_admin,mao_staff');

    Route::get('/registrants/duplicates', [RegistrantController::class, 'duplicates'])->middleware('role:super_admin,mao_staff,crop_head,fish_head,livestock_head,poultry_head');
    Route::get('/registrants/rsbsa-bulk-download', [RegistrantController::class, 'rsbsaBulk'])->middleware('role:super_admin,mao_staff,crop_head,fish_head,livestock_head,poultry_head');
    Route::get('/archived/registrants', [ArchivedRecordController::class, 'registrants'])->middleware('role:super_admin,mao_staff,crop_head,fish_head,livestock_head,poultry_head');
    Route::post('/archived/registrants/{id}/restore', [ArchivedRecordController::class, 'restoreRegistrant'])->middleware('role:super_admin,mao_staff,crop_head,fish_head,livestock_head,poultry_head');
    Route::delete('/archived/registrants/{id}/force', [ArchivedRecordController::class, 'deleteRegistrant'])->middleware('role:super_admin,mao_staff,crop_head,fish_head,livestock_head,poultry_head');
    Route::get('/archived/assistance-applications', [ArchivedRecordController::class, 'assistance'])->middleware('role:super_admin,mao_staff,crop_head,fish_head,livestock_head,poultry_head');
    Route::post('/archived/assistance-applications/{assistanceApplication}/restore', [ArchivedRecordController::class, 'restoreAssistance'])->middleware('role:super_admin,mao_staff,crop_head,fish_head,livestock_head,poultry_head');
    Route::delete('/archived/assistance-applications/{assistanceApplication}/force', [ArchivedRecordController::class, 'deleteAssistance'])->middleware('role:super_admin,mao_staff,crop_head,fish_head,livestock_head,poultry_head');
    Route::get('/archived/insurance-claims', [ArchivedRecordController::class, 'insurance'])->middleware('role:super_admin,mao_staff,crop_head,fish_head,livestock_head,poultry_head');
    Route::post('/archived/insurance-claims/{insuranceClaim}/restore', [ArchivedRecordController::class, 'restoreInsurance'])->middleware('role:super_admin,mao_staff,crop_head,fish_head,livestock_head,poultry_head');
    Route::delete('/archived/insurance-claims/{insuranceClaim}/force', [ArchivedRecordController::class, 'deleteInsurance'])->middleware('role:super_admin,mao_staff,crop_head,fish_head,livestock_head,poultry_head');
    Route::get('/registrants/{registrant}/digital-id', [RegistrantController::class, 'digitalId']);
    Route::post('/registrants/{registrant}/approve', [RegistrantController::class, 'approve'])->middleware('role:super_admin,mao_staff,crop_head,fish_head,livestock_head,poultry_head');
    Route::post('/registrants/{registrant}/deactivate', [RegistrantController::class, 'deactivate'])->middleware('role:super_admin,mao_staff,crop_head,fish_head,livestock_head,poultry_head');
    Route::apiResource('registrants', RegistrantController::class);

    Route::get('/geo-locations', [GeoLocationController::class, 'index'])->middleware('role:super_admin,mao_staff,crop_head,fish_head,livestock_head,poultry_head,farmer');
    Route::post('/geo-locations/preview', [GeoLocationController::class, 'preview'])->middleware('role:super_admin,mao_staff,crop_head,fish_head,livestock_head,poultry_head');
    Route::post('/geo-locations/upload', [GeoLocationController::class, 'upload'])->middleware('role:super_admin,mao_staff,crop_head,fish_head,livestock_head,poultry_head');

    Route::apiResource('assistance-applications', AssistanceApplicationController::class)->middleware('role:super_admin,mao_staff,crop_head,fish_head,livestock_head,poultry_head');
    Route::apiResource('insurance-claims', InsuranceClaimController::class)->middleware('role:super_admin,mao_staff,crop_head,fish_head,livestock_head,poultry_head');
    Route::apiResource('announcements', AnnouncementController::class)->except(['index', 'show'])->middleware('role:super_admin,mao_staff,crop_head,fish_head,livestock_head,poultry_head');

    Route::get('/notification-deliveries', [NotificationDeliveryController::class, 'index']);
    Route::post('/notifications/resend-bulk', [NotificationDeliveryController::class, 'resendBulk'])->middleware('role:super_admin,mao_staff,crop_head,fish_head,livestock_head,poultry_head');
    Route::post('/notifications/{notificationDelivery}/resend', [NotificationDeliveryController::class, 'resend'])->middleware('role:super_admin,mao_staff,crop_head,fish_head,livestock_head,poultry_head');
    Route::apiResource('notification-deliveries', NotificationDeliveryController::class)->only(['store', 'update', 'destroy'])->middleware('role:super_admin,mao_staff,crop_head,fish_head,livestock_head,poultry_head');
    Route::get('/audit-logs', [AuditLogController::class, 'index'])->middleware('role:super_admin');
    Route::get('/audit-logs/export', [AuditLogController::class, 'export'])->middleware('role:super_admin');

    Route::get('/users/stats', [UserManagementController::class, 'stats'])->middleware('role:super_admin');
    Route::apiResource('users', UserManagementController::class)->only(['index', 'store', 'update', 'destroy'])->middleware('role:super_admin');
    Route::post('/users/{user}/barangays', [UserManagementController::class, 'updateBarangays'])->middleware('role:super_admin');
    Route::post('/users/{user}/grant-role', [UserManagementController::class, 'grantRole'])->middleware('role:super_admin');
    Route::post('/users/{user}/activate', [UserManagementController::class, 'activate'])->middleware('role:super_admin');
    Route::post('/users/{user}/deactivate', [UserManagementController::class, 'deactivate'])->middleware('role:super_admin');
    Route::post('/users/{user}/archive', [UserManagementController::class, 'archive'])->middleware('role:super_admin');
    Route::post('/users/{user}/restore', [UserManagementController::class, 'restore'])->middleware('role:super_admin');
    Route::post('/users/{user}/reset-password', [UserManagementController::class, 'resetPassword'])->middleware('role:super_admin');
});
