from django.apps import AppConfig


class WorklogsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.worklogs'
    verbose_name = 'Work Logs & Time Tracking'

    def ready(self):
        """
        Drop the surcharge caches whenever the configuration changes.

        Without this, editing a percentage in the dashboard would not affect
        calculations until the process restarted.
        """
        from django.db.models.signals import post_delete, post_save

        from apps.customers.models import CustomerServiceRate, CustomerServiceSurcharge
        from apps.employees.models import SurchargeType
        from .models import clear_surcharge_caches

        for model in (SurchargeType, CustomerServiceSurcharge, CustomerServiceRate):
            post_save.connect(clear_surcharge_caches, sender=model,
                              dispatch_uid=f'clear_surcharges_{model.__name__}')
            post_delete.connect(clear_surcharge_caches, sender=model,
                                dispatch_uid=f'clear_surcharges_del_{model.__name__}')
