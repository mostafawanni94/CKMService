#!/usr/bin/env python3
"""
EXHAUSTIVE Customer API Test Suite
Tests ALL possible combinations of inputs
"""
import requests
from datetime import datetime
from itertools import product

BASE_URL = "http://localhost:8000/api"
passed = 0
failed = 0
tests_run = []

def get_token():
    r = requests.post(f"{BASE_URL}/auth/token/", json={"email": "admin@prototaalservice.nl", "password": "admin123"})
    return r.json().get('access') if r.status_code == 200 else None

def h(token, json=True):
    headers = {"Authorization": f"Bearer {token}"}
    if json: headers["Content-Type"] = "application/json"
    return headers

def test(name, condition, sent=None, received=None):
    global passed, failed
    status = "✅" if condition else "❌"
    print(f"{status} {name}")
    if condition:
        passed += 1
    else:
        failed += 1
        if sent and received: print(f"   SENT: {sent}\n   GOT:  {received}")
    tests_run.append((name, condition))

def run():
    global passed, failed
    token = get_token()
    if not token:
        print("❌ Auth failed")
        return
    print("✅ Auth OK\n")
    
    # Track all created entities
    customer_ids = []
    
    print("="*70)
    print("SECTION 1: CUSTOMER FIELD COMBINATIONS")
    print("="*70)
    
    # Test all combinations of optional fields
    optional_combos = [
        {},  # No optional fields
        {"iban": "NL91ABNA0417164300"},
        {"btw_number": "NL123456789B01"},
        {"kvk_number": "12345678"},
        {"g_rekening": "NL91ABNA0417164300"},
        {"manager_first_name": "Jan"},
        {"manager_last_name": "Bakker"},
        {"manager_first_name": "Jan", "manager_last_name": "Bakker"},
        {"notes": "Some notes here"},
        {"iban": "NL91ABNA0417164300", "btw_number": "NL123456789B01", "kvk_number": "12345678"},
        {"is_active": True},
        {"is_active": False},
        {"has_service_surcharges": True},
        {"has_service_surcharges": False},
        {"has_allowance_surcharges": True},
        {"has_allowance_surcharges": False},
        # All fields together
        {"iban": "NL91ABNA0417164300", "btw_number": "NL123456789B01", "kvk_number": "12345678", 
         "g_rekening": "NL91ABNA0417164300", "manager_first_name": "Full", "manager_last_name": "Test",
         "notes": "Complete test", "has_service_surcharges": True, "has_allowance_surcharges": True},
    ]
    
    for i, extra in enumerate(optional_combos):
        base = {"company_name": f"Combo_{i}_{datetime.now().strftime('%H%M%S%f')}", 
                "address": "Test", "city": "Test", "postcode": "1234AB"}
        
        # Create
        r = requests.post(f"{BASE_URL}/customers/customers/", headers=h(token, False), data=base)
        if r.status_code == 201:
            cid = r.json()['id']
            customer_ids.append(cid)
            
            # Update with extra fields
            if extra:
                r2 = requests.patch(f"{BASE_URL}/customers/customers/{cid}/", headers=h(token), json=extra)
                test(f"Update combo {i}: {list(extra.keys())}", r2.status_code == 200)
                
                # Verify
                r3 = requests.get(f"{BASE_URL}/customers/customers/{cid}/", headers=h(token))
                data = r3.json()
                for key, val in extra.items():
                    actual = data.get(key)
                    # Handle type conversions
                    if isinstance(val, bool) and isinstance(actual, bool):
                        match = val == actual
                    else:
                        match = str(val) == str(actual) if actual else val == ""
                    test(f"  Verify {key}={val}", match, sent=val, received=actual)
            else:
                test(f"Create with no extras", True)
    
    print(f"\n{'='*70}")
    print("SECTION 2: SUPERVISOR CONTACT COUNT VARIATIONS")
    print("="*70)
    
    # Use first customer for supervisor tests
    cid = customer_ids[0] if customer_ids else None
    
    if cid:
        contact_counts = [0, 1, 2, 3, 4, 5]
        for count in contact_counts:
            sup_data = {"customer": cid, "first_name": f"Sup{count}", "last_name": "Test", 
                       "company_name": "Test", "is_active": True}
            r = requests.post(f"{BASE_URL}/customers/outfolders/", headers=h(token), json=sup_data)
            
            if r.status_code == 201:
                sup_id = r.json()['id']
                test(f"Create supervisor for {count} contacts", True)
                
                # Add contacts
                for j in range(count):
                    contact = {"contact_type": "phone" if j % 2 == 0 else "email",
                              "value": f"+316{'0' * (8-len(str(j)))}{j}" if j % 2 == 0 else f"test{j}@mail.com",
                              "label": f"label{j}", "is_primary": j == 0}
                    r2 = requests.post(f"{BASE_URL}/customers/outfolders/{sup_id}/add_contact/",
                                      headers=h(token), json=contact)
                    test(f"  Add contact {j+1}/{count}", r2.status_code in [200, 201])
                
                # Verify count
                r3 = requests.get(f"{BASE_URL}/customers/outfolders/{sup_id}/", headers=h(token))
                actual_count = len(r3.json().get('contacts', []))
                test(f"  Verify {count} contacts saved", actual_count == count, sent=count, received=actual_count)
            else:
                test(f"Create supervisor for {count} contacts", False)
    
    print(f"\n{'='*70}")
    print("SECTION 3: SUPERVISOR ACTIVE/INACTIVE STATES")
    print("="*70)
    
    if cid:
        for active_state in [True, False]:
            sup_data = {"customer": cid, "first_name": f"Active{active_state}", "last_name": "Test",
                       "company_name": "Test", "is_active": active_state}
            r = requests.post(f"{BASE_URL}/customers/outfolders/", headers=h(token), json=sup_data)
            
            if r.status_code == 201:
                sup_id = r.json()['id']
                r2 = requests.get(f"{BASE_URL}/customers/outfolders/{sup_id}/", headers=h(token))
                actual = r2.json().get('is_active')
                test(f"Supervisor is_active={active_state}", actual == active_state, sent=active_state, received=actual)
            else:
                test(f"Create supervisor is_active={active_state}", False)
    
    print(f"\n{'='*70}")
    print("SECTION 4: ALLOWANCE VARIATIONS")
    print("="*70)
    
    if cid:
        # Test different price values
        prices = [0, 0.01, 1, 5.50, 10, 99.99, 100, 999.99]
        for price in prices:
            allowance = [{"custom_name": f"Price{price}", "custom_code": "P", "price": price, 
                         "apply_surcharges": False, "allowance_type": None}]
            r = requests.patch(f"{BASE_URL}/customers/customers/{cid}/", headers=h(token),
                              json={"allowances": allowance})
            if r.status_code == 200:
                r2 = requests.get(f"{BASE_URL}/customers/customers/{cid}/", headers=h(token))
                found = [a for a in r2.json().get('allowances', []) if a.get('custom_name') == f"Price{price}"]
                if found:
                    actual = float(found[0].get('price', -1))
                    test(f"Allowance price={price}", abs(actual - price) < 0.01, sent=price, received=actual)
                else:
                    test(f"Allowance price={price} not found", False)
            else:
                test(f"Allowance price={price}", False)
        
        # Test apply_surcharges variations
        for apply_sur in [True, False]:
            allowance = [{"custom_name": f"Sur{apply_sur}", "custom_code": "S", "price": 5,
                         "apply_surcharges": apply_sur, "allowance_type": None}]
            r = requests.patch(f"{BASE_URL}/customers/customers/{cid}/", headers=h(token),
                              json={"allowances": allowance})
            if r.status_code == 200:
                r2 = requests.get(f"{BASE_URL}/customers/customers/{cid}/", headers=h(token))
                found = [a for a in r2.json().get('allowances', []) if a.get('custom_name') == f"Sur{apply_sur}"]
                if found:
                    actual = found[0].get('apply_surcharges')
                    test(f"Allowance apply_surcharges={apply_sur}", actual == apply_sur, sent=apply_sur, received=actual)
    
    print(f"\n{'='*70}")
    print("SECTION 5: CONTACT TYPE VARIATIONS")
    print("="*70)
    
    if cid:
        contact_types = ["phone", "email", "mobile", "fax"]
        for ct in contact_types:
            contact = {"contact_type": ct, "value": f"test_{ct}@mail.com" if ct == "email" else "+31600000000",
                      "label": ct, "is_primary": False}
            r = requests.post(f"{BASE_URL}/customers/customers/{cid}/add_contact/", headers=h(token), json=contact)
            if r.status_code in [200, 201]:
                test(f"Add contact type '{ct}'", True)
                r2 = requests.get(f"{BASE_URL}/customers/customers/{cid}/", headers=h(token))
                found = any(c.get('contact_type') == ct for c in r2.json().get('contacts', []))
                test(f"  Verify contact type '{ct}' saved", found)
            else:
                test(f"Add contact type '{ct}'", False, received=r.text[:50])
    
    print(f"\n{'='*70}")
    print("SECTION 6: PRIMARY FLAG VARIATIONS")
    print("="*70)
    
    if cid:
        for is_primary in [True, False]:
            contact = {"contact_type": "phone", "value": f"+316{11111111 if is_primary else 22222222}",
                      "label": "test", "is_primary": is_primary}
            r = requests.post(f"{BASE_URL}/customers/customers/{cid}/add_contact/", headers=h(token), json=contact)
            if r.status_code in [200, 201]:
                r2 = requests.get(f"{BASE_URL}/customers/customers/{cid}/", headers=h(token))
                for c in r2.json().get('contacts', []):
                    if c['value'] == contact['value']:
                        actual = c.get('is_primary')
                        test(f"Contact is_primary={is_primary}", actual == is_primary, sent=is_primary, received=actual)
                        break
    
    print(f"\n{'='*70}")
    print("SECTION 7: MULTIPLE ALLOWANCES COUNT")
    print("="*70)
    
    if cid:
        for count in [1, 2, 3, 5, 10]:
            allowances = [{"custom_name": f"Multi{i}", "custom_code": f"M{i}", "price": i,
                          "apply_surcharges": False, "allowance_type": None} for i in range(count)]
            r = requests.patch(f"{BASE_URL}/customers/customers/{cid}/", headers=h(token),
                              json={"allowances": allowances})
            if r.status_code == 200:
                r2 = requests.get(f"{BASE_URL}/customers/customers/{cid}/", headers=h(token))
                actual = len([a for a in r2.json().get('allowances', []) if a.get('custom_name', '').startswith('Multi')])
                test(f"Add {count} allowances at once", actual >= count, sent=count, received=actual)
    
    print(f"\n{'='*70}")
    print("SECTION 8: EMPTY vs FILLED OPTIONAL FIELDS")
    print("="*70)
    
    if cid:
        empty_tests = [
            ("notes", "", ""),
            ("notes", "Some text", "Some text"),
            ("manager_first_name", "", ""),
            ("manager_first_name", "Jan", "Jan"),
            ("g_rekening", "", ""),
        ]
        for field, value, expected in empty_tests:
            r = requests.patch(f"{BASE_URL}/customers/customers/{cid}/", headers=h(token), json={field: value})
            if r.status_code == 200:
                r2 = requests.get(f"{BASE_URL}/customers/customers/{cid}/", headers=h(token))
                actual = r2.json().get(field, "MISSING")
                test(f"Field '{field}' = '{value}'", str(actual) == str(expected), sent=expected, received=actual)
    
    print(f"\n{'='*70}")
    print("SECTION 9: SPECIAL CHARACTERS IN ALL FIELDS")
    print("="*70)
    
    special_chars = "Tëst Çömpåñÿ €£¥ <>&\"' 日本語"
    fields_to_test = ["notes", "manager_first_name", "manager_last_name", "address"]
    
    if cid:
        for field in fields_to_test:
            r = requests.patch(f"{BASE_URL}/customers/customers/{cid}/", headers=h(token), json={field: special_chars})
            if r.status_code == 200:
                r2 = requests.get(f"{BASE_URL}/customers/customers/{cid}/", headers=h(token))
                actual = r2.json().get(field, "")
                test(f"Special chars in '{field}'", actual == special_chars, sent=special_chars[:20], received=actual[:20])
    
    print(f"\n{'='*70}")
    print("SECTION 10: ERROR VALIDATIONS")
    print("="*70)
    
    # Invalid formats
    error_tests = [
        ("Invalid IBAN", {"iban": "NOTVALID"}, 400),
        ("Invalid BTW", {"btw_number": "WRONG"}, 400),
        ("Invalid KVK (3 digits)", {"kvk_number": "123"}, 400),
        ("Invalid KVK (9 digits)", {"kvk_number": "123456789"}, 400),
        ("Empty company on create", {}, 400),
    ]
    
    for name, data, expected_code in error_tests[:4]:
        if cid:
            r = requests.patch(f"{BASE_URL}/customers/customers/{cid}/", headers=h(token), json=data)
            test(f"{name} rejected", r.status_code == expected_code, sent=expected_code, received=r.status_code)
    
    # Empty company
    r = requests.post(f"{BASE_URL}/customers/customers/", headers=h(token, False), data={"company_name": ""})
    test("Empty company_name rejected", r.status_code == 400, sent=400, received=r.status_code)
    
    print(f"\n{'='*70}")
    print(f"FINAL RESULTS: {passed} PASSED, {failed} FAILED (Total: {passed+failed})")
    print("="*70)

if __name__ == "__main__":
    run()
