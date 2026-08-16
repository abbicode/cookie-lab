import unittest

from recipe_parser import parse_cookie_recipe


class RecipeParserTests(unittest.TestCase):
    def test_parses_classic_chocolate_chip_recipe_and_method(self):
        parsed = parse_cookie_recipe(
            """
            2 1/4 cups all-purpose flour
            1 cup butter, softened
            3/4 cup granulated sugar
            3/4 cup packed brown sugar
            2 large eggs
            1 teaspoon baking soda
            2 cups chocolate chips

            Cream the butter and sugars. Bake at 375°F for 9 to 11 minutes.
            Portion into 30 g dough balls.
            """
        )

        recipe = parsed.recipe
        self.assertEqual(recipe["flour_g"], 281.25)
        self.assertEqual(recipe["butter_g"], 226.0)
        self.assertEqual(recipe["white_sugar_g"], 150.0)
        self.assertEqual(recipe["light_brown_sugar_g"], 165.0)
        self.assertEqual(recipe["egg_g"], 100.0)
        self.assertEqual(recipe["baking_soda_g"], 4.6)
        self.assertEqual(recipe["chocolate_g"], 340.0)
        self.assertEqual(recipe["butter_state"], "softened")
        self.assertEqual(recipe["mixing_method"], "creamed")
        self.assertEqual(recipe["bake_temp_f"], 375)
        self.assertEqual(recipe["bake_time_min"], 10)
        self.assertEqual(recipe["cookie_size_g"], 30)

    def test_supports_unicode_fractions_weights_and_chilling(self):
        parsed = parse_cookie_recipe(
            """
            280 g flour
            1/2 cup melted butter
            ¾ cup white sugar
            ¾ cup brown sugar
            1 egg plus 1 egg yolk
            1 tsp baking powder
            12 oz chocolate chips
            Stir until combined. Chill for 90 minutes.
            Preheat oven to 180°C and bake for 12 minutes.
            """
        )

        recipe = parsed.recipe
        self.assertEqual(recipe["flour_g"], 280)
        self.assertEqual(recipe["butter_g"], 113)
        self.assertEqual(recipe["white_sugar_g"], 150)
        self.assertEqual(recipe["light_brown_sugar_g"], 165)
        self.assertEqual(recipe["egg_g"], 50)
        self.assertEqual(recipe["egg_yolk_g"], 18)
        self.assertEqual(recipe["baking_powder_g"], 4)
        self.assertAlmostEqual(recipe["chocolate_g"], 340.19, places=2)
        self.assertEqual(recipe["butter_state"], "melted")
        self.assertEqual(recipe["mixing_method"], "stirred")
        self.assertEqual(recipe["chill_hours"], 1.5)
        self.assertEqual(recipe["bake_temp_f"], 356)
        self.assertEqual(recipe["bake_time_min"], 12)

    def test_reports_unmapped_measured_ingredients_and_defaults(self):
        parsed = parse_cookie_recipe(
            """
            2 cups flour
            1 cup butter
            1 cup sugar
            1 cup rolled oats
            """
        )

        self.assertIn("1 cup rolled oats", parsed.unparsed_lines)
        self.assertTrue(any("defaulted to 350°F" in warning for warning in parsed.warnings))
        self.assertTrue(any("rolled oats" in warning for warning in parsed.warnings))


if __name__ == "__main__":
    unittest.main()
