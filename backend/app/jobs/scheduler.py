# backend/app/jobs/scheduler.py
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from app.services import ebay_service
from app.database import SessionLocal
from tzlocal import get_localzone
import logging

# Create scheduler with local system timezone
scheduler = BackgroundScheduler(timezone=str(get_localzone()))

def fetch_sales_job():
    db = SessionLocal()
    try:
        logging.info("[Scheduler] Running scheduled eBay sales fetch...")
        new_count = ebay_service.sync_recent_sales(db)
        logging.info(f"[Scheduler] eBay sync complete. {new_count} new sales added.")
    except Exception as e:
        logging.exception("[Scheduler] Error during eBay sales fetch")
    finally:
        db.close()

def start_scheduler(app_state=None):
    if app_state and getattr(app_state, "scheduler_started", False):
        logging.info("[Scheduler] Already started, skipping.")
        return

    scheduler.start()
    # Run job every day at 3 AM server time
    scheduler.add_job(fetch_sales_job, CronTrigger(hour=3, minute=0))
    logging.info("[Scheduler] Started, job scheduled for 3 AM daily.")

    if app_state:
        app_state.scheduler_started = True

def stop_scheduler():
    if scheduler.running:
        logging.info("[Scheduler] Stopping scheduler...")
        scheduler.shutdown(wait=False)
