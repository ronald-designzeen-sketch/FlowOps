#!/usr/bin/env python3
"""
FlowOps Backend API Testing Suite
Tests the complete user journey: signup → login → projects → tasks → time tracking → dashboard
"""

import requests
import json
import time
import uuid
from datetime import datetime

# Configuration
BASE_URL = "https://team-productivity.preview.emergentagent.com/api"
TEST_USER_EMAIL = f"testuser_{uuid.uuid4().hex[:8]}@flowops.com"
TEST_USER_PASSWORD = "SecurePass123!"
TEST_USER_NAME = "John Doe"

class FlowOpsAPITester:
    def __init__(self):
        self.session_token = None
        self.user_id = None
        self.workspace_id = None
        self.project_id = None
        self.task_id = None
        self.time_entry_id = None
        
    def log(self, message):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}")
        
    def make_request(self, method, endpoint, data=None, auth_required=True):
        """Make HTTP request with proper headers"""
        url = f"{BASE_URL}/{endpoint}"
        headers = {"Content-Type": "application/json"}
        
        if auth_required and self.session_token:
            headers["Authorization"] = f"Bearer {self.session_token}"
            
        try:
            if method == "GET":
                response = requests.get(url, headers=headers)
            elif method == "POST":
                response = requests.post(url, headers=headers, json=data)
            elif method == "PUT":
                response = requests.put(url, headers=headers, json=data)
            elif method == "DELETE":
                response = requests.delete(url, headers=headers)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            self.log(f"{method} {endpoint} -> {response.status_code}")
            return response
        except Exception as e:
            self.log(f"ERROR: {method} {endpoint} failed: {str(e)}")
            return None
    
    def test_1_signup(self):
        """Test user signup and workspace creation"""
        self.log("=== Testing User Signup ===")
        
        signup_data = {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "name": TEST_USER_NAME
        }
        
        response = self.make_request("POST", "auth/signup", signup_data, auth_required=False)
        
        if not response:
            self.log("❌ Signup request failed")
            return False
            
        if response.status_code == 200:
            data = response.json()
            if data.get("user") and data.get("session"):
                self.user_id = data["user"]["id"]
                self.session_token = data["session"]["access_token"]
                self.log(f"✅ Signup successful - User ID: {self.user_id}")
                self.log(f"✅ Session token received: {self.session_token[:20]}...")
                return True
            else:
                self.log(f"❌ Signup response missing user/session: {data}")
                return False
        else:
            self.log(f"❌ Signup failed: {response.status_code} - {response.text}")
            return False
    
    def test_2_login(self):
        """Test user login"""
        self.log("=== Testing User Login ===")
        
        login_data = {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        }
        
        response = self.make_request("POST", "auth/login", login_data, auth_required=False)
        
        if not response:
            self.log("❌ Login request failed")
            return False
            
        if response.status_code == 200:
            data = response.json()
            if data.get("user") and data.get("session"):
                self.session_token = data["session"]["access_token"]
                self.log(f"✅ Login successful - New token: {self.session_token[:20]}...")
                return True
            else:
                self.log(f"❌ Login response missing user/session: {data}")
                return False
        else:
            self.log(f"❌ Login failed: {response.status_code} - {response.text}")
            return False
    
    def test_3_create_project(self):
        """Test project creation"""
        self.log("=== Testing Project Creation ===")
        
        project_data = {
            "name": "FlowOps Test Project",
            "description": "A test project for API validation",
            "workspace_id": self.workspace_id or str(uuid.uuid4())  # Use workspace_id if available
        }
        
        response = self.make_request("POST", "projects", project_data)
        
        if not response:
            self.log("❌ Create project request failed")
            return False
            
        if response.status_code == 200:
            data = response.json()
            if data.get("project"):
                self.project_id = data["project"]["id"]
                self.log(f"✅ Project created successfully - ID: {self.project_id}")
                return True
            else:
                self.log(f"❌ Project creation response missing project: {data}")
                return False
        else:
            self.log(f"❌ Project creation failed: {response.status_code} - {response.text}")
            return False
    
    def test_4_get_projects(self):
        """Test getting all projects"""
        self.log("=== Testing Get Projects ===")
        
        response = self.make_request("GET", "projects")
        
        if not response:
            self.log("❌ Get projects request failed")
            return False
            
        if response.status_code == 200:
            data = response.json()
            if "projects" in data:
                projects = data["projects"]
                self.log(f"✅ Retrieved {len(projects)} projects")
                if self.project_id:
                    found_project = any(p["id"] == self.project_id for p in projects)
                    if found_project:
                        self.log("✅ Created project found in list")
                    else:
                        self.log("⚠️ Created project not found in list")
                return True
            else:
                self.log(f"❌ Get projects response missing projects: {data}")
                return False
        else:
            self.log(f"❌ Get projects failed: {response.status_code} - {response.text}")
            return False
    
    def test_5_create_task(self):
        """Test task creation"""
        self.log("=== Testing Task Creation ===")
        
        task_data = {
            "title": "Implement API Testing",
            "description": "Create comprehensive tests for all FlowOps APIs",
            "status": "todo",
            "priority": "high",
            "project_id": self.project_id,
            "assignee_id": self.user_id
        }
        
        response = self.make_request("POST", "tasks", task_data)
        
        if not response:
            self.log("❌ Create task request failed")
            return False
            
        if response.status_code == 200:
            data = response.json()
            if data.get("task"):
                self.task_id = data["task"]["id"]
                self.log(f"✅ Task created successfully - ID: {self.task_id}")
                return True
            else:
                self.log(f"❌ Task creation response missing task: {data}")
                return False
        else:
            self.log(f"❌ Task creation failed: {response.status_code} - {response.text}")
            return False
    
    def test_6_get_tasks(self):
        """Test getting all tasks"""
        self.log("=== Testing Get Tasks ===")
        
        response = self.make_request("GET", "tasks")
        
        if not response:
            self.log("❌ Get tasks request failed")
            return False
            
        if response.status_code == 200:
            data = response.json()
            if "tasks" in data:
                tasks = data["tasks"]
                self.log(f"✅ Retrieved {len(tasks)} tasks")
                if self.task_id:
                    found_task = any(t["id"] == self.task_id for t in tasks)
                    if found_task:
                        self.log("✅ Created task found in list")
                        # Check if task has project info and time entries
                        task = next(t for t in tasks if t["id"] == self.task_id)
                        if task.get("project"):
                            self.log("✅ Task includes project information")
                        if "time_entries" in task:
                            self.log("✅ Task includes time entries")
                        if "total_time" in task:
                            self.log(f"✅ Task includes total_time: {task['total_time']} minutes")
                    else:
                        self.log("⚠️ Created task not found in list")
                return True
            else:
                self.log(f"❌ Get tasks response missing tasks: {data}")
                return False
        else:
            self.log(f"❌ Get tasks failed: {response.status_code} - {response.text}")
            return False
    
    def test_7_update_task(self):
        """Test task status update"""
        self.log("=== Testing Task Update ===")
        
        if not self.task_id:
            self.log("❌ No task ID available for update")
            return False
        
        update_data = {
            "status": "in_progress"
        }
        
        response = self.make_request("PUT", f"tasks/{self.task_id}", update_data)
        
        if not response:
            self.log("❌ Update task request failed")
            return False
            
        if response.status_code == 200:
            data = response.json()
            if data.get("task"):
                updated_status = data["task"]["status"]
                if updated_status == "in_progress":
                    self.log("✅ Task status updated successfully to 'in_progress'")
                    return True
                else:
                    self.log(f"❌ Task status not updated correctly: {updated_status}")
                    return False
            else:
                self.log(f"❌ Task update response missing task: {data}")
                return False
        else:
            self.log(f"❌ Task update failed: {response.status_code} - {response.text}")
            return False
    
    def test_8_start_timer(self):
        """Test starting time tracking"""
        self.log("=== Testing Start Timer ===")
        
        if not self.task_id:
            self.log("❌ No task ID available for timer")
            return False
        
        timer_data = {
            "task_id": self.task_id,
            "description": "Working on API testing implementation"
        }
        
        response = self.make_request("POST", "time-entries/start", timer_data)
        
        if not response:
            self.log("❌ Start timer request failed")
            return False
            
        if response.status_code == 200:
            data = response.json()
            if data.get("entry"):
                self.time_entry_id = data["entry"]["id"]
                start_time = data["entry"]["start_time"]
                self.log(f"✅ Timer started successfully - Entry ID: {self.time_entry_id}")
                self.log(f"✅ Start time: {start_time}")
                return True
            else:
                self.log(f"❌ Start timer response missing entry: {data}")
                return False
        else:
            self.log(f"❌ Start timer failed: {response.status_code} - {response.text}")
            return False
    
    def test_9_get_active_timer(self):
        """Test getting active timer"""
        self.log("=== Testing Get Active Timer ===")
        
        response = self.make_request("GET", "time-entries/active")
        
        if not response:
            self.log("❌ Get active timer request failed")
            return False
            
        if response.status_code == 200:
            data = response.json()
            entry = data.get("entry")
            if entry:
                if entry["id"] == self.time_entry_id:
                    self.log("✅ Active timer retrieved successfully")
                    self.log(f"✅ Timer running for task: {entry.get('task', {}).get('title', 'Unknown')}")
                    return True
                else:
                    self.log(f"❌ Active timer ID mismatch: expected {self.time_entry_id}, got {entry['id']}")
                    return False
            else:
                self.log("❌ No active timer found")
                return False
        else:
            self.log(f"❌ Get active timer failed: {response.status_code} - {response.text}")
            return False
    
    def test_10_wait_and_stop_timer(self):
        """Test stopping timer after waiting"""
        self.log("=== Testing Stop Timer (after 3 seconds) ===")
        
        if not self.time_entry_id:
            self.log("❌ No time entry ID available for stopping")
            return False
        
        # Wait 3 seconds to have some duration
        self.log("⏳ Waiting 3 seconds to accumulate time...")
        time.sleep(3)
        
        stop_data = {
            "entry_id": self.time_entry_id
        }
        
        response = self.make_request("POST", "time-entries/stop", stop_data)
        
        if not response:
            self.log("❌ Stop timer request failed")
            return False
            
        if response.status_code == 200:
            data = response.json()
            if data.get("entry"):
                entry = data["entry"]
                duration = entry.get("duration", 0)
                end_time = entry.get("end_time")
                self.log(f"✅ Timer stopped successfully")
                self.log(f"✅ Duration: {duration} minutes")
                self.log(f"✅ End time: {end_time}")
                
                # Verify duration is reasonable (should be at least 0 minutes)
                if duration >= 0:
                    self.log("✅ Duration calculation appears correct")
                    return True
                else:
                    self.log(f"❌ Invalid duration: {duration}")
                    return False
            else:
                self.log(f"❌ Stop timer response missing entry: {data}")
                return False
        else:
            self.log(f"❌ Stop timer failed: {response.status_code} - {response.text}")
            return False
    
    def test_11_get_time_entries(self):
        """Test getting all time entries"""
        self.log("=== Testing Get Time Entries ===")
        
        response = self.make_request("GET", "time-entries")
        
        if not response:
            self.log("❌ Get time entries request failed")
            return False
            
        if response.status_code == 200:
            data = response.json()
            if "entries" in data:
                entries = data["entries"]
                self.log(f"✅ Retrieved {len(entries)} time entries")
                
                if self.time_entry_id:
                    found_entry = any(e["id"] == self.time_entry_id for e in entries)
                    if found_entry:
                        self.log("✅ Created time entry found in list")
                        entry = next(e for e in entries if e["id"] == self.time_entry_id)
                        if entry.get("task"):
                            self.log("✅ Time entry includes task information")
                        if entry.get("duration") is not None:
                            self.log(f"✅ Time entry has duration: {entry['duration']} minutes")
                    else:
                        self.log("⚠️ Created time entry not found in list")
                return True
            else:
                self.log(f"❌ Get time entries response missing entries: {data}")
                return False
        else:
            self.log(f"❌ Get time entries failed: {response.status_code} - {response.text}")
            return False
    
    def test_12_get_time_entries_by_task(self):
        """Test getting time entries filtered by task"""
        self.log("=== Testing Get Time Entries by Task ===")
        
        if not self.task_id:
            self.log("❌ No task ID available for filtering")
            return False
        
        response = self.make_request("GET", f"time-entries?task_id={self.task_id}")
        
        if not response:
            self.log("❌ Get time entries by task request failed")
            return False
            
        if response.status_code == 200:
            data = response.json()
            if "entries" in data:
                entries = data["entries"]
                self.log(f"✅ Retrieved {len(entries)} time entries for task")
                
                # Verify all entries are for the correct task
                all_correct_task = all(e.get("task_id") == self.task_id for e in entries)
                if all_correct_task:
                    self.log("✅ All entries are for the correct task")
                else:
                    self.log("❌ Some entries are for different tasks")
                    return False
                return True
            else:
                self.log(f"❌ Get time entries by task response missing entries: {data}")
                return False
        else:
            self.log(f"❌ Get time entries by task failed: {response.status_code} - {response.text}")
            return False
    
    def test_13_dashboard_stats(self):
        """Test dashboard statistics"""
        self.log("=== Testing Dashboard Stats ===")
        
        response = self.make_request("GET", "dashboard/stats")
        
        if not response:
            self.log("❌ Get dashboard stats request failed")
            return False
            
        if response.status_code == 200:
            data = response.json()
            if "taskStats" in data and "timeStats" in data:
                task_stats = data["taskStats"]
                time_stats = data["timeStats"]
                
                self.log(f"✅ Task Stats - Total: {task_stats.get('total', 0)}")
                self.log(f"✅ Task Stats - Todo: {task_stats.get('todo', 0)}")
                self.log(f"✅ Task Stats - In Progress: {task_stats.get('in_progress', 0)}")
                self.log(f"✅ Task Stats - Completed: {task_stats.get('completed', 0)}")
                
                self.log(f"✅ Time Stats - Today: {time_stats.get('today', 0)} minutes")
                self.log(f"✅ Time Stats - Week: {time_stats.get('week', 0)} minutes")
                self.log(f"✅ Time Stats - Month: {time_stats.get('month', 0)} minutes")
                
                # Verify our task is counted
                if task_stats.get("in_progress", 0) >= 1:
                    self.log("✅ Our in_progress task is counted in stats")
                
                # Verify our time is counted (should be at least some time today)
                if time_stats.get("today", 0) > 0:
                    self.log("✅ Our time entry is counted in today's stats")
                
                return True
            else:
                self.log(f"❌ Dashboard stats response missing taskStats/timeStats: {data}")
                return False
        else:
            self.log(f"❌ Dashboard stats failed: {response.status_code} - {response.text}")
            return False
    
    def test_14_logout(self):
        """Test user logout"""
        self.log("=== Testing User Logout ===")
        
        response = self.make_request("POST", "auth/logout", {})
        
        if not response:
            self.log("❌ Logout request failed")
            return False
            
        if response.status_code == 200:
            data = response.json()
            if data.get("message"):
                self.log("✅ Logout successful")
                return True
            else:
                self.log(f"❌ Logout response missing message: {data}")
                return False
        else:
            self.log(f"❌ Logout failed: {response.status_code} - {response.text}")
            return False
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        self.log("🚀 Starting FlowOps Backend API Tests")
        self.log(f"📧 Test User: {TEST_USER_EMAIL}")
        self.log(f"🌐 Base URL: {BASE_URL}")
        
        tests = [
            ("User Signup", self.test_1_signup),
            ("User Login", self.test_2_login),
            ("Create Project", self.test_3_create_project),
            ("Get Projects", self.test_4_get_projects),
            ("Create Task", self.test_5_create_task),
            ("Get Tasks", self.test_6_get_tasks),
            ("Update Task", self.test_7_update_task),
            ("Start Timer", self.test_8_start_timer),
            ("Get Active Timer", self.test_9_get_active_timer),
            ("Stop Timer", self.test_10_wait_and_stop_timer),
            ("Get Time Entries", self.test_11_get_time_entries),
            ("Get Time Entries by Task", self.test_12_get_time_entries_by_task),
            ("Dashboard Stats", self.test_13_dashboard_stats),
            ("User Logout", self.test_14_logout)
        ]
        
        results = {}
        
        for test_name, test_func in tests:
            self.log(f"\n{'='*50}")
            try:
                result = test_func()
                results[test_name] = result
                if result:
                    self.log(f"✅ {test_name}: PASSED")
                else:
                    self.log(f"❌ {test_name}: FAILED")
            except Exception as e:
                self.log(f"💥 {test_name}: ERROR - {str(e)}")
                results[test_name] = False
        
        # Summary
        self.log(f"\n{'='*50}")
        self.log("📊 TEST SUMMARY")
        self.log(f"{'='*50}")
        
        passed = sum(1 for r in results.values() if r)
        total = len(results)
        
        for test_name, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            self.log(f"{status} {test_name}")
        
        self.log(f"\n🎯 Results: {passed}/{total} tests passed")
        
        if passed == total:
            self.log("🎉 ALL TESTS PASSED! FlowOps backend is working correctly.")
        else:
            self.log(f"⚠️  {total - passed} tests failed. Please check the logs above.")
        
        return results

if __name__ == "__main__":
    tester = FlowOpsAPITester()
    results = tester.run_all_tests()