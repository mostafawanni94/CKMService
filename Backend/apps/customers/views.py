"""
Customer API Views.
"""

from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import timezone
from django.db.models import Case, When, Value, IntegerField

from apps.employees.views import IsAdmin
from apps.core.pagination import StandardPagination
from .models import (
    Customer, CustomerContact, Outfolder, OutfolderContact, Service,
    CustomerContractHistory, CustomerServiceRateHistory, Gratuity
)
from .serializers import (
    CustomerListSerializer, CustomerDetailSerializer,
    CustomerContactSerializer, OutfolderSerializer, OutfolderContactSerializer, ServiceSerializer,
    CustomerContractHistorySerializer, CustomerServiceRateHistorySerializer, GratuitySerializer
)


class CustomerViewSet(viewsets.ModelViewSet):
    """
    ViewSet for customer management (admin only).
    
    List API: Returns minimal fields for fast loading
    Detail API: Returns full nested data (contacts, supervisors, allowances, etc.)
    
    Supports:
    - Pagination: ?page=1&page_size=10 (max 100)
    - Search: ?search=company_name
    - Ordering: ?ordering=-created_at (default: newest first)
    """
    
    permission_classes = [IsAdmin]
    pagination_class = StandardPagination
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ['company_name', 'city', 'address']
    ordering_fields = ['company_name', 'city', 'created_at', 'is_active']
    ordering = ['-created_at']  # Default: newest first
    
    def get_queryset(self):
        """Return optimized querysets based on action."""
        if self.action == 'list':
            # Light query for list - only count aggregations, no nested data
            return Customer.objects.only(
                'id', 'company_name', 'city', 'country', 'is_active', 'created_at'
            ).order_by('-created_at')
        
        # Full query for detail view with prefetch for nested data
        return Customer.objects.prefetch_related(
            'contacts', 'outfolders', 'outfolders__contacts', 
            'projects', 'service_rates', 'service_rates__service',
            'surcharges', 'surcharges__surcharge_type',
            'allowances', 'allowances__allowance_type',
            'service_surcharges', 'allowance_surcharges'
        ).order_by('-created_at')
    
    def get_serializer_class(self):
        if self.action == 'list':
            return CustomerListSerializer
        return CustomerDetailSerializer
    
    def perform_create(self, serializer):
        customer = serializer.save(created_by=self.request.user)
        self._handle_service_rates(customer)
        self._handle_surcharges(customer)
        self._handle_service_surcharges(customer)
        self._handle_allowance_surcharges(customer)
        self._handle_allowances(customer)
    
    def perform_update(self, serializer):
        customer = serializer.save(updated_by=self.request.user)
        self._handle_service_rates(customer)
        self._handle_surcharges(customer)
        self._handle_service_surcharges(customer)
        self._handle_allowance_surcharges(customer)
        self._handle_allowances(customer)
    
    def _handle_service_rates(self, customer):
        """Handle saving of nested service rates."""
        service_rates_data = self.request.data.get('service_rates')
        if service_rates_data is not None:
            # Clear existing rates and recreate
            # This handles updates, deletions, and additions
            from .models import Service, CustomerServiceRate
            current_rates = {rate.service_id: rate for rate in customer.service_rates.all()}
            
            # If empty list passed, deletion enabled -> clear all
            # But usually we filter enabled ones in frontend.
            
            # Only process if list is valid
            if isinstance(service_rates_data, list):
                # Get IDs of services to keep
                new_service_ids = set()
                
                for rate_data in service_rates_data:
                    service_id = rate_data.get('service_id')
                    try:
                        price = float(rate_data.get('price', 0))
                    except (ValueError, TypeError):
                        price = 0
                        
                    if service_id:
                        new_service_ids.add(int(service_id))
                        CustomerServiceRate.objects.update_or_create(
                            customer=customer,
                            service_id=service_id,
                            defaults={
                                'price': price,
                                'is_active': rate_data.get('is_active', True)
                            }
                        )
                
                # Optional: Delete rates not in the new list if precise sync desired
                # customer.service_rates.exclude(service_id__in=new_service_ids).delete()
    
    def _handle_surcharges(self, customer):
        """Handle saving of nested customer surcharges."""
        surcharges_data = self.request.data.get('surcharges')
        if surcharges_data is not None and isinstance(surcharges_data, list):
            from .models import CustomerSurcharge
            
            for surcharge_data in surcharges_data:
                surcharge_type_id = surcharge_data.get('surcharge_type')
                try:
                    percentage = float(surcharge_data.get('percentage', 25))
                except (ValueError, TypeError):
                    percentage = 25
                    
                if surcharge_type_id:
                    CustomerSurcharge.objects.update_or_create(
                        customer=customer,
                        surcharge_type_id=surcharge_type_id,
                        defaults={
                            'percentage': percentage,
                            'is_enabled': surcharge_data.get('is_enabled', True)
                        }
                    )

    def _handle_service_surcharges(self, customer):
        """Handle saving of nested customer service surcharges."""
        surcharges_data = self.request.data.get('service_surcharges')
        if surcharges_data is not None and isinstance(surcharges_data, list):
            from .models import CustomerServiceSurcharge
            
            for surcharge_data in surcharges_data:
                surcharge_type_id = surcharge_data.get('surcharge_type')
                try:
                    percentage = float(surcharge_data.get('percentage', 25))
                except (ValueError, TypeError):
                    percentage = 25
                    
                if surcharge_type_id:
                    CustomerServiceSurcharge.objects.update_or_create(
                        customer=customer,
                        surcharge_type_id=surcharge_type_id,
                        defaults={
                            'percentage': percentage,
                            'is_enabled': surcharge_data.get('is_enabled', True)
                        }
                    )

    def _handle_allowance_surcharges(self, customer):
        """Handle saving of nested customer allowance surcharges."""
        surcharges_data = self.request.data.get('allowance_surcharges')
        if surcharges_data is not None and isinstance(surcharges_data, list):
            from .models import CustomerAllowanceSurcharge
            
            for surcharge_data in surcharges_data:
                surcharge_type_id = surcharge_data.get('surcharge_type')
                try:
                    percentage = float(surcharge_data.get('percentage', 25))
                except (ValueError, TypeError):
                    percentage = 25
                    
                if surcharge_type_id:
                    CustomerAllowanceSurcharge.objects.update_or_create(
                        customer=customer,
                        surcharge_type_id=surcharge_type_id,
                        defaults={
                            'percentage': percentage,
                            'is_enabled': surcharge_data.get('is_enabled', True)
                        }
                    )

    def _handle_allowances(self, customer):
        """Handle saving of nested customer allowances."""
        allowances_data = self.request.data.get('allowances')
        if allowances_data is not None and isinstance(allowances_data, list):
            from .models import CustomerAllowance
            
            # Track IDs we're updating/creating so we can delete removed ones
            updated_ids = set()
            
            for allowance_data in allowances_data:
                allowance_type_id = allowance_data.get('allowance_type')
                custom_name = allowance_data.get('custom_name', '').strip()
                custom_code = allowance_data.get('custom_code', '').strip()
                
                # Check if we have data to save - either an allowance_type or a custom name
                if not allowance_type_id and not custom_name:
                    continue
                
                try:
                    price = float(allowance_data.get('price', 0))
                except (ValueError, TypeError):
                    price = 0
                
                # Check for existing allowance by ID first
                existing_id = allowance_data.get('id')
                
                if existing_id:
                    # Update existing
                    try:
                        allowance = CustomerAllowance.objects.get(id=existing_id, customer=customer)
                        allowance.allowance_type_id = allowance_type_id
                        allowance.custom_name = custom_name
                        allowance.custom_code = custom_code
                        allowance.price = price
                        allowance.is_enabled = allowance_data.get('is_enabled', True)
                        allowance.apply_surcharges = allowance_data.get('apply_surcharges', False)
                        allowance.save()
                        updated_ids.add(allowance.id)
                    except CustomerAllowance.DoesNotExist:
                        pass
                elif allowance_type_id:
                    # Get or create based on allowance_type
                    allowance, created = CustomerAllowance.objects.update_or_create(
                        customer=customer,
                        allowance_type_id=allowance_type_id,
                        defaults={
                            'custom_name': custom_name,
                            'custom_code': custom_code,
                            'price': price,
                            'is_enabled': allowance_data.get('is_enabled', True),
                            'apply_surcharges': allowance_data.get('apply_surcharges', False),
                        }
                    )
                    updated_ids.add(allowance.id)
                else:
                    # Create custom allowance (no allowance_type)
                    allowance = CustomerAllowance.objects.create(
                        customer=customer,
                        allowance_type=None,
                        custom_name=custom_name,
                        custom_code=custom_code,
                        price=price,
                        is_enabled=allowance_data.get('is_enabled', True),
                        apply_surcharges=allowance_data.get('apply_surcharges', False),
                    )
                    updated_ids.add(allowance.id)
                
                # Handle enabled_surcharges (M2M) if present
                enabled_surcharges_ids = allowance_data.get('enabled_surcharges_ids', [])
                if isinstance(enabled_surcharges_ids, list) and hasattr(allowance, 'enabled_surcharges'):
                    allowance.enabled_surcharges.set(enabled_surcharges_ids)


    @action(detail=True, methods=['post'])
    def add_contact(self, request, pk=None):
        """Add a contact to a customer."""
        customer = self.get_object()
        serializer = CustomerContactSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(customer=customer)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def contract_history(self, request, pk=None):
        """Get contract history for this customer."""
        customer = self.get_object()
        # Order by: current first (effective_to is null), then by effective_from descending
        history = customer.contract_history.all().annotate(
            is_current=Case(
                When(effective_to__isnull=True, then=Value(0)),
                default=Value(1),
                output_field=IntegerField()
            )
        ).order_by('is_current', '-effective_from', '-created_at')
        serializer = CustomerContractHistorySerializer(history, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def upload_contract(self, request, pk=None):
        """
        Upload a new contract document for this customer.
        
        POST /api/customers/{id}/upload_contract/
        Form data:
        - contract_document: File (required)
        - effective_from: Date (required - can be future date)
        - notes: String (optional)
        """
        customer = self.get_object()
        
        contract_file = request.FILES.get('contract_document')
        if not contract_file:
            return Response({'error': 'Contract document is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        effective_from = request.data.get('effective_from')
        if not effective_from:
            effective_from = timezone.now().date()
        else:
            # Parse string date to date object
            from datetime import datetime
            if isinstance(effective_from, str):
                effective_from = datetime.strptime(effective_from, '%Y-%m-%d').date()
        
        notes = request.data.get('notes', '')
        today = timezone.now().date()

        
        # Close any previous contract that is still open (effective_to is null)
        # Set its effective_to to one day before the new contract's effective_from
        previous_contract = CustomerContractHistory.objects.filter(
            customer=customer,
            effective_to__isnull=True
        ).first()
        
        if previous_contract:
            # Set effective_to to one day before new contract starts
            from datetime import timedelta
            previous_contract.effective_to = effective_from - timedelta(days=1)
            previous_contract.save()
        
        # Get current service rates for snapshot
        service_rates_snapshot = list(customer.service_rates.filter(is_active=True).values(
            'service_id', 'service__name', 'price'
        ))
        # Format for better readability
        service_rates_snapshot = [
            {'service_id': sr['service_id'], 'service_name': sr['service__name'], 'price': str(sr['price'])}
            for sr in service_rates_snapshot
        ]
        
        # Create new contract history entry
        new_contract = CustomerContractHistory.objects.create(
            customer=customer,
            contract_document=contract_file,
            effective_from=effective_from,
            notes=notes,
            uploaded_by=request.user if request.user.is_authenticated else None,
            service_rates_snapshot=service_rates_snapshot
        )
        
        serializer = CustomerContractHistorySerializer(new_contract, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    
    @action(detail=True, methods=['get'])
    def service_rate_history(self, request, pk=None):
        """Get service rate history for this customer."""
        customer = self.get_object()
        service_id = request.query_params.get('service_id')
        
        history = customer.service_rate_history.all()
        if service_id:
            history = history.filter(service_id=service_id)
        
        # Order by: current first, then by effective_from descending
        history = history.annotate(
            is_current=Case(
                When(effective_to__isnull=True, then=Value(0)),
                default=Value(1),
                output_field=IntegerField()
            )
        ).order_by('is_current', '-effective_from', '-created_at')
        
        serializer = CustomerServiceRateHistorySerializer(history, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def update_service_rates(self, request, pk=None):
        """
        Update service rates with optional future effective date.
        
        POST /api/customers/{id}/update_service_rates/
        JSON data:
        - effective_from: Date (required - can be future date)
        - rates: [{ service_id: int, price: decimal }]
        """
        customer = self.get_object()
        
        effective_from = request.data.get('effective_from')
        if not effective_from:
            effective_from = timezone.now().date()
        
        rates_data = request.data.get('rates', [])
        if not rates_data:
            return Response({'error': 'No rate data provided'}, status=status.HTTP_400_BAD_REQUEST)
        
        today = timezone.now().date()
        yesterday = today - timezone.timedelta(days=1)
        created_rates = []
        
        for rate_data in rates_data:
            service_id = rate_data.get('service_id')
            price = rate_data.get('price')
            
            if not service_id or price is None:
                continue
            
            # Close previous rate if any (only if effective now)
            if effective_from <= today:
                previous_rate = CustomerServiceRateHistory.objects.filter(
                    customer=customer,
                    service_id=service_id,
                    effective_to__isnull=True
                ).first()
                
                if previous_rate:
                    if previous_rate.effective_from == today:
                        previous_rate.effective_to = today
                    else:
                        previous_rate.effective_to = yesterday
                    previous_rate.save()
            
            # Create new rate history entry
            new_rate = CustomerServiceRateHistory.objects.create(
                customer=customer,
                service_id=service_id,
                price=price,
                effective_from=effective_from,
                changed_by=request.user if request.user.is_authenticated else None
            )
            created_rates.append(new_rate)
            
            # Update current CustomerServiceRate if effective now
            if effective_from <= today:
                from .models import CustomerServiceRate
                CustomerServiceRate.objects.update_or_create(
                    customer=customer,
                    service_id=service_id,
                    defaults={'price': price, 'is_active': True}
                )
        
        serializer = CustomerServiceRateHistorySerializer(created_rates, many=True)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ServiceViewSet(viewsets.ModelViewSet):
    """ViewSet for Service management."""
    from .models import Service
    from .serializers import ServiceSerializer
    
    queryset = Service.objects.filter(is_active=True).order_by('name')
    serializer_class = ServiceSerializer
    permission_classes = [IsAdmin]


class OutfolderViewSet(viewsets.ModelViewSet):
    """ViewSet for outfolder/rayon manager management."""
    
    queryset = Outfolder.objects.select_related(
        'customer'
    ).prefetch_related('contacts').order_by('last_name')
    serializer_class = OutfolderSerializer
    permission_classes = [IsAdmin]
    
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['post'])
    def add_contact(self, request, pk=None):
        """Add a contact to an outfolder."""
        outfolder = self.get_object()
        serializer = OutfolderContactSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(outfolder=outfolder)
        return Response(serializer.data)


# =============================================================================
# GRATUITY VIEWSET
# =============================================================================

class GratuityViewSet(viewsets.ModelViewSet):
    """ViewSet for managing gratuities (tips)."""
    
    serializer_class = GratuitySerializer
    permission_classes = [IsAdmin]
    
    def get_queryset(self):
        queryset = Gratuity.objects.select_related('customer', 'employee', 'employee__user').all()
        
        # Filter by customer
        customer_id = self.request.query_params.get('customer')
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)
        
        # Filter by employee
        employee_id = self.request.query_params.get('employee')
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        
        # Filter by status
        status = self.request.query_params.get('status')
        if status:
            queryset = queryset.filter(status=status)
        
        # Filter by date range
        date_from = self.request.query_params.get('date_from')
        if date_from:
            queryset = queryset.filter(date_received__gte=date_from)
        
        date_to = self.request.query_params.get('date_to')
        if date_to:
            queryset = queryset.filter(date_received__lte=date_to)
        
        return queryset.order_by('-date_received')
    
    @action(detail=True, methods=['post'])
    def mark_paid(self, request, pk=None):
        """Mark a gratuity as paid to employee."""
        gratuity = self.get_object()
        paid_date = request.data.get('paid_date', timezone.now().date())
        gratuity.status = 'paid'
        gratuity.paid_to_employee_date = paid_date
        gratuity.save()
        return Response(GratuitySerializer(gratuity).data)


# =============================================================================
# EMPLOYEE-ACCESSIBLE VIEWSETS (for Flutter app)
# =============================================================================

class EmployeeCustomerViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for employees to access customers for worklog submission.
    Read-only access to basic customer info.
    """
    from rest_framework.permissions import IsAuthenticated
    
    queryset = Customer.objects.filter(is_active=True).order_by('company_name')
    serializer_class = CustomerListSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=True, methods=['get'])
    def outfolders(self, request, pk=None):
        """Get supervisors (outfolders) for a customer."""
        customer = self.get_object()
        outfolders = Outfolder.objects.filter(customer=customer, is_active=True)
        serializer = OutfolderSerializer(outfolders, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def services(self, request, pk=None):
        """Get services for a customer."""
        from .models import CustomerServiceRate
        customer = self.get_object()
        # Get services that have rates defined for this customer
        service_rates = CustomerServiceRate.objects.filter(
            customer=customer
        ).select_related('service')
        services = [{'id': sr.service.id, 'name': sr.service.name} for sr in service_rates if sr.service]
        return Response(services)
    
    @action(detail=True, methods=['get'])
    def projects(self, request, pk=None):
        """Get projects for a customer."""
        from apps.projects.models import Project
        customer = self.get_object()
        projects = Project.objects.filter(
            customer=customer, 
            status__in=['active', 'pending']
        ).values('id', 'name', 'location', 'location_address', 'location_city')
        return Response(list(projects))
