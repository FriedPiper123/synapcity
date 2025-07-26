#!/usr/bin/env python3
"""
Test script for enhanced route functionality
"""
import asyncio
import json
from datetime import datetime
from app.agents.route_intelligence.smart_route import SynapCitySmartTrafficIntelligence

async def test_enhanced_route_analysis():
    """Test the enhanced route analysis with detailed data extraction"""
    
    print("🚀 Testing Enhanced Route Analysis...")
    print("=" * 50)
    
    try:
        async with SynapCitySmartTrafficIntelligence() as synap_city:
            # Test parameters
            origin = "HSR Layout, Bangalore, India"
            destination = "Kempegowda International Airport, Bangalore, India"
            departure_time = int(datetime.now().timestamp() * 1000)
            
            print(f"📍 Origin: {origin}")
            print(f"🎯 Destination: {destination}")
            print(f"⏰ Departure Time: {datetime.fromtimestamp(departure_time/1000)}")
            print()
            
            # Get route insights
            print("🔄 Fetching route insights...")
            routes_with_insights = await synap_city.get_per_route_insights(origin, destination, departure_time)
            
            print("✅ Route analysis completed!")
            print()
            
            # Analyze the response structure
            insights = routes_with_insights.get('insights', [])
            analysis_metadata = routes_with_insights.get('analysis_metadata', {})
            
            print(f"📊 Found {len(insights)} routes")
            print(f"🔍 Data sources used: {analysis_metadata.get('data_sources_used', 'Unknown')}")
            print(f"🎯 Overall reliability: {analysis_metadata.get('overall_reliability', 'Unknown')}")
            print()
            
            # Analyze each route
            for i, route in enumerate(insights):
                print(f"🛣️  Route {i+1} (ID: {route.get('route_id', 'Unknown')})")
                print("-" * 30)
                
                route_groups = route.get('insights', [])
                print(f"   📍 Segments: {len(route_groups)}")
                
                total_delay = 0
                confidence_scores = []
                
                for j, group in enumerate(route_groups):
                    print(f"   📍 Segment {j+1}: {group.get('group_id', 'Unknown')}")
                    
                    # Traffic analysis
                    traffic_analysis = group.get('traffic_analysis', {})
                    if traffic_analysis:
                        speed_reduction = traffic_analysis.get('speed_reduction_percent')
                        delay_minutes = traffic_analysis.get('delay_minutes')
                        print(f"      🚗 Speed reduction: {speed_reduction}%" if speed_reduction else "      🚗 Speed reduction: N/A")
                        print(f"      ⏱️  Delay: {delay_minutes} min" if delay_minutes else "      ⏱️  Delay: N/A")
                    
                    # Active incidents
                    active_incidents = group.get('active_incidents', [])
                    if active_incidents:
                        print(f"      ⚠️  Active incidents: {len(active_incidents)}")
                        for incident in active_incidents[:2]:  # Show first 2
                            print(f"         • {incident.get('type', 'Unknown')}: {incident.get('description', 'No description')}")
                    
                    # Weather impact
                    weather_impact = group.get('weather_impact', {})
                    if weather_impact and weather_impact.get('affecting_traffic'):
                        print(f"      🌤️  Weather: {weather_impact.get('conditions', 'Unknown')} ({weather_impact.get('impact_level', 'Unknown')} impact)")
                    
                    # Key factors
                    key_factors = group.get('key_factors', [])
                    if key_factors:
                        print(f"      🔑 Key factors: {len(key_factors)}")
                        for factor in key_factors[:2]:  # Show first 2
                            print(f"         • {factor}")
                    
                    # Alternative suggestion
                    alternative = group.get('alternative_suggestion')
                    if alternative:
                        print(f"      🛣️  Alternative: {alternative}")
                    
                    # Status and recommendation
                    status = group.get('overall_status', 'Unknown')
                    recommendation = group.get('recommendation', 'Unknown')
                    confidence = group.get('confidence_score', 0)
                    
                    print(f"      📊 Status: {status.upper()}")
                    print(f"      💡 Recommendation: {recommendation.upper()}")
                    print(f"      🎯 Confidence: {confidence:.2f}")
                    
                    # Accumulate metrics
                    total_delay += group.get('total_delay', 0)
                    confidence_scores.append(confidence)
                    
                    print()
                
                # Route summary
                avg_confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0
                print(f"   📈 Route Summary:")
                print(f"      Total delay: {total_delay} minutes")
                print(f"      Average confidence: {avg_confidence:.2f}")
                print()
            
            print("✅ Enhanced route analysis test completed successfully!")
            return True
            
    except Exception as e:
        print(f"❌ Error during route analysis: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    asyncio.run(test_enhanced_route_analysis()) 