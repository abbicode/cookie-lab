import unittest

from baseline_recipes import NESTLE_TOLL_HOUSE
from recommendation_engine import PHENOTYPE_KEYS, generate_cookie_recommendations


class RecommendationEngineTests(unittest.TestCase):
    def test_uses_requested_toll_house_style_baseline(self):
        self.assertEqual(NESTLE_TOLL_HOUSE["flour_g"], 280)
        self.assertEqual(NESTLE_TOLL_HOUSE["butter_g"], 113)
        self.assertEqual(NESTLE_TOLL_HOUSE["white_sugar_g"], 150)
        self.assertEqual(NESTLE_TOLL_HOUSE["light_brown_sugar_g"], 150)
        self.assertEqual(NESTLE_TOLL_HOUSE["egg_g"], 50)
        self.assertEqual(NESTLE_TOLL_HOUSE["chocolate_g"], 170)
        self.assertEqual(NESTLE_TOLL_HOUSE["bake_temp_f"], 350)

    def test_generates_three_analyzed_ranked_recommendations(self):
        result = generate_cookie_recommendations({
            "bite": "deeply_chewy",
            "center": "pillow_soft",
            "shape": "thick_tall",
            "inside": "rich_gooey",
        })

        recommendations = result["recommendations"]
        self.assertEqual(
            [recommendation["name"] for recommendation in recommendations],
            ["Science Match", "Cookie Lab Recommended", "Experimental"],
        )
        self.assertEqual(sorted(item["rank"] for item in recommendations), [1, 2, 3])
        self.assertEqual(len(result["ranking"]), 3)

        for recommendation in recommendations:
            self.assertEqual(
                set(recommendation["predicted_phenotype"]),
                set(PHENOTYPE_KEYS),
            )
            self.assertIsInstance(recommendation["confidence_score"], (int, float))
            self.assertTrue(recommendation["changes"])
            self.assertTrue(recommendation["ingredients"])
            self.assertTrue(recommendation["explanation"])

        recommended = recommendations[1]["recipe"]
        self.assertGreater(recommended["light_brown_sugar_g"], NESTLE_TOLL_HOUSE["light_brown_sugar_g"])
        self.assertLess(recommended["white_sugar_g"], NESTLE_TOLL_HOUSE["white_sugar_g"])
        self.assertGreater(recommended["egg_yolk_g"], 0)
        self.assertGreater(recommended["flour_g"], NESTLE_TOLL_HOUSE["flour_g"])
        self.assertGreater(recommended["chill_hours"], 0)

    def test_thin_crisp_preferences_use_melted_butter_and_no_chill(self):
        result = generate_cookie_recommendations({
            "bite": "crisp_snappy",
            "center": "fully_baked",
            "shape": "thin_wide",
            "inside": "moist_tender",
        })
        recipe = result["recommendations"][1]["recipe"]

        self.assertEqual(recipe["butter_state"], "melted")
        self.assertEqual(recipe["mixing_method"], "stirred")
        self.assertEqual(recipe["chill_hours"], 0)
        self.assertLess(recipe["flour_g"], NESTLE_TOLL_HOUSE["flour_g"])
        self.assertGreater(recipe["white_sugar_g"], NESTLE_TOLL_HOUSE["white_sugar_g"])

    def test_rejects_missing_preferences(self):
        with self.assertRaisesRegex(ValueError, "Missing preference"):
            generate_cookie_recommendations({"bite": "balanced"})


if __name__ == "__main__":
    unittest.main()
