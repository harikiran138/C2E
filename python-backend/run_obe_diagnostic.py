import unittest
import json
import os
import sys

# Ensure tests are importable
sys.path.append(os.path.join(os.path.dirname(__file__), 'tests'))

from tests.obe_test_suite import OBETestSuite

def run_diagnostic():
    print("\n" + "="*60)
    print("🚀 STRATEGIC OBE DIAGNOSTIC RUNNER")
    print("="*60)
    
    suite = unittest.TestLoader().loadTestsFromTestCase(OBETestSuite)
    runner = unittest.TextTestRunner(verbosity=1)
    result = runner.run(suite)
    
    # Calculate Metrics
    total = result.testsRun
    failed = len(result.failures)
    errors = len(result.errors)
    passed = total - failed - errors
    pass_rate = (passed / total) * 100 if total > 0 else 0
    
    print("\n" + "="*60)
    print("📊 STRATEGIC HEALTH REPORT")
    print("="*60)
    print(f"✅ PASSED:  {passed}")
    print(f"❌ FAILED:  {failed}")
    print(f"⚠️ ERRORS:  {errors}")
    print(f"📈 RATE:    {pass_rate:.1f}%")
    print("="*60)
    
    # Generate JSON Report
    report = {
        "summary": {
            "total_tests": total,
            "passed": passed,
            "failed": failed,
            "errors": errors,
            "pass_rate": pass_rate
        },
        "details": []
    }
    
    for failure in result.failures:
        report["details"].append({
            "test": str(failure[0]),
            "status": "FAIL",
            "message": failure[1]
        })
        
    for error in result.errors:
        report["details"].append({
            "test": str(error[0]),
            "status": "ERROR",
            "message": error[1]
        })
        
    report_path = os.path.join(os.path.dirname(__file__), 'strategic_health_report.json')
    with open(report_path, 'w') as f:
        json.dump(report, f, indent=4)
        
    print(f"\n📁 Report saved to: {report_path}")
    
    if pass_rate < 100:
        print("\n🚩 Action Required: Some strategic health checks failed. Review the report.")
    else:
        print("\n✨ All strategic health checks passed!")

if __name__ == "__main__":
    run_diagnostic()
