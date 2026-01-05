# Generated manually for service/allowance surcharges reorganization

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('customers', '0013_add_per_service_surcharges_and_custom_allowances'),
        ('employees', '0009_employeeprofile_can_add_allowances_and_more'),
    ]

    operations = [
        # Add has_service_surcharges and has_allowance_surcharges to Customer
        migrations.AddField(
            model_name='customer',
            name='has_service_surcharges',
            field=models.BooleanField(default=False, verbose_name='Enable Service Surcharges'),
        ),
        migrations.AddField(
            model_name='customer',
            name='has_allowance_surcharges',
            field=models.BooleanField(default=False, verbose_name='Enable Allowance Surcharges'),
        ),
        
        # Drop the old CustomerServiceSurcharge (linked to service rate) and recreate
        migrations.DeleteModel(
            name='CustomerServiceSurcharge',
        ),
        
        # Create CustomerServiceSurcharge linked to Customer
        migrations.CreateModel(
            name='CustomerServiceSurcharge',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Created At')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Updated At')),
                ('percentage', models.DecimalField(decimal_places=2, default=25.00, max_digits=5, verbose_name='Percentage (%)')),
                ('is_enabled', models.BooleanField(default=True, verbose_name='Is Enabled')),
                ('customer', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='service_surcharges', to='customers.customer', verbose_name='Customer')),
                ('surcharge_type', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='customer_service_surcharges', to='employees.surchargetype', verbose_name='Surcharge Type')),
            ],
            options={
                'verbose_name': 'Customer Service Surcharge',
                'verbose_name_plural': 'Customer Service Surcharges',
                'ordering': ['surcharge_type__name'],
                'unique_together': {('customer', 'surcharge_type')},
            },
        ),
        
        # Create CustomerAllowanceSurcharge
        migrations.CreateModel(
            name='CustomerAllowanceSurcharge',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True, verbose_name='Created At')),
                ('updated_at', models.DateTimeField(auto_now=True, verbose_name='Updated At')),
                ('percentage', models.DecimalField(decimal_places=2, default=25.00, max_digits=5, verbose_name='Percentage (%)')),
                ('is_enabled', models.BooleanField(default=True, verbose_name='Is Enabled')),
                ('customer', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='allowance_surcharges', to='customers.customer', verbose_name='Customer')),
                ('surcharge_type', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='customer_allowance_surcharges', to='employees.surchargetype', verbose_name='Surcharge Type')),
            ],
            options={
                'verbose_name': 'Customer Allowance Surcharge',
                'verbose_name_plural': 'Customer Allowance Surcharges',
                'ordering': ['surcharge_type__name'],
                'unique_together': {('customer', 'surcharge_type')},
            },
        ),
    ]
