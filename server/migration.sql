-- Drop existing tables if they exist
DROP TABLE IF EXISTS instructions;
DROP TABLE IF EXISTS ingredients;
DROP TABLE IF EXISTS recipes;

-- Create recipes table
CREATE TABLE recipes (
  id SERIAL PRIMARY KEY,
  contributor TEXT NOT NULL,
  recipe_name TEXT NOT NULL,
  style TEXT NOT NULL,
  image_url TEXT
);

-- Create ingredients table
CREATE TABLE ingredients (
  id SERIAL PRIMARY KEY,
  recipe_id INT NOT NULL,
  ingredient TEXT NOT NULL,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id)
);

-- Create instructions table
CREATE TABLE instructions (
  id SERIAL PRIMARY KEY,
  recipe_id INT NOT NULL,
  step_order INT NOT NULL,
  step TEXT NOT NULL,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id)
);

-- Insert into recipes table
INSERT INTO recipes (contributor, recipe_name, style, image_url)
VALUES 
  ('Danny', 'Just Okay Beef Stew', 'American', 'https://www.budgetbytes.com/wp-content/uploads/2023/02/Slow-Cooker-Beef-Stew-V1.jpeg'),
  ('Mitchell', 'Pork Adobo', 'Filipino', 'https://thewoksoflife.com/wp-content/uploads/2016/12/pork-adobo-4.jpg'),
  ('Mitchell', 'Pad Thai', 'Thai', 'https://hot-thai-kitchen.com/wp-content/uploads/2019/09/pad-thai-blog.jpg'),
  ('Mitchell', 'Creamy Garlic Pork Chops', 'American', 'https://www.saltandlavender.com/wp-content/uploads/2020/07/creamy-garlic-pork-chops-1-1024x1536.jpg'),
  ('Ethan', 'Crushed Potatoes with Spring Onions and Cheese', 'English', 'https://cdn-images.the-express.com/img/dynamic/39/590x/118267_1.jpg');
-- Get recipe IDs
SELECT id FROM recipes;

-- Insert into ingredients table
INSERT INTO ingredients (recipe_id, ingredient)
VALUES  
  (1, '2 lbs red potatoes'),
  (1, '1 yellow onion'),
  (1, '3 carrots'),
  (1, '4 stalks celery'),
  (1, '4 cloves garlic'),
  (1, '1.5 lbs beef stew meat'),
  (1, '2 tbsp all purpose flour'),
  (1, '1/4 tsp salt'),
  (1, '1/4 tsp freshly cracked pepper'),
  (1, '2 tbsp cooking oil'),
  (1, '1 tbsp soy sauce'),
  (1, '1.5 tsp brown sugar'),
  (1, '1.5 tsp dried rosemary'),
  (1, '1.5 tsp dried thyme'),
  (2, '2 tablespoons vegetable oil'),
  (2, '2 pounds pork shoulder (cut into chunks)'),
  (2, '1/4 cup cane vinegar or white vinegar'),
  (2, '1/3 cup low sodium soy sauce'),
  (2, '6 cloves garlic (chopped)'),
  (2, '1 bay leaf'),
  (2, '2 teaspoons black peppercorns'),
  (2, '2 teaspoons sugar'),
  (2, '2 cups water'),
  (3, '4oz (115g) dry rice noodles, medium size, soak in room temp water for 1 hour'),
  (3, '2 Tbsp dried shrimp, medium size, roughly chopped'),
  (3, '3 cloves garlic, chopped'),
  (3, '¼ cup roughly chopped shallots'),
  (3, '3 oz (85 g) pressed tofu, cut into small pieces'),
  (3, '3 Tbsp finely chopped SWEET preserved daikon radish'),
  (3, 'Dried chili flakes, to taste (optional)'),
  (3, '3 Tbsp (45 ml) vegetable oil'),
  (3, '10 medium sized shrimp, or as many as you like'),
  (3, '2 eggs'),
  (3, '2 ½ cups (120 g)bean sprouts, loosely packed'),
  (3, '7-10 stalks (70 g) garlic chives, cut into 2” pieces'),
  (3, '¼ cup roasted peanuts, roughly chopped'),
  (3, '1 lime'),
  (3, 'Garnishes and condiments for serving: chili flakes, roasted peanuts, bean sprouts and garlic chives.'),
  (4, '4 pork chops see notes'),
  (4, 'Salt & pepper to taste'),
  (4, '1 tablespoon olive oil'),
  (4, '2 tablespoons butter divided'),
  (4, '1 whole head garlic cloves peeled'),
  (4, '1 tablespoon flour'),
  (4, '1/2 cup chicken broth or stock'),
  (4, '1/2 teaspoon lemon juice'),
  (4, '1/4 teaspoon garlic powder'),
  (4, '3/4 cup heavy/whipping cream'),
  (4, 'Fresh parsley chopped (optional, to taste)'),
  (5, '1.25kg red-skinned potatoes, unpeeled (cut any large ones to the same size as the smaller ones)'),
  (5, '30g of butter, optional'),
  (5, '4 spring onions'),
  (5, '100g cornichonns or sweet pickled gherkins'),
  (5, '175g Gruyere cheese, grated'),
  (5, 'Sea salt and freshly ground black pepper');


-- Insert into instructions table
INSERT INTO instructions (recipe_id, step_order, step)
VALUES
  (1, 1, 'Dice the onion and red potatoes. Slice the carrots and celery. Mince the garlic. Place the prepared vegetables in a four or five quart slow cooker.'),
  (1, 2, 'Place the stew meat in a bowl and sprinkle the flour, salt, and pepper over top. Toss the meat until it is evenly coated in flour.'),
  (1, 3, 'Heat a large skillet over medium-high. Once very hot, add the cooking oil and swirl to coat the surface of the skillet. Add the stew meat and cook, without stirring, until browned on the bottom. Stir and then allow the beef to brown on a second side. Transfer the meat to the slow cooker.'),
  (1, 4, 'Turn the heat under the skillet down to medium-low. Add the broth, Dijon, Worcestershire sauce, soy sauce, brown sugar, rosemary, and thyme to the skillet. Stir and cook over medium-low until all the browned bits have dissolved off the bottom of the skillet.'),
  (1, 5, 'Pour the broth over the ingredients in the slow cooker and everything a good stir.'),
  (1, 6, 'Place the lid on the slow cooker and cook on high for four hours or low for eight hours.'),
  (1, 7, 'After cooking the meat and vegetables should both be tender. Stir the stew well to allow the potatoes to slightly break down and thicken the gravy. Taste the stew and adjust the salt or other seasonings to your liking. Serve hot!'),
  (2, 1, 'In a medium dutch oven or pot over medium high heat, add the oil and sear the pork until browned on all sides.'),
  (2, 2, 'Add the vinegar, soy sauce, garlic, bay leaf, peppercorns (tied in cheese cloth if desired), sugar, and water, and bring to a boil. Reduce the heat to medium low, cover, and simmer for 1 hour.'),
  (2, 3, 'Remove the cover and continue simmering for another 30 minutes to reduce the sauce.'),
  (2, 4, 'Serve over rice!'),
  (3, 1, 'Add palm sugar to a small pot and melt over medium heat. Once the sugar is melting, keep stirring until it darkens in colour (see video for colour). Immediately add water, fish sauce, and tamarind paste. The sugar will harden immediately and this is okay.'),
  (3, 2, 'Bring sauce to a simmer, then turn off heat. The hardened sugar will not have dissolved at this point, but let it sit while you prep other ingredients and it should be dissolved by the time you need it. Check that it is dissolved before you start cooking!'),
  (3, 3, 'Cut drained noodles once with scissors so they are half as long. This makes them easier to toss and separate in the wok.'),
  (3, 4, 'In a bowl, combine tofu, garlic, shallots, preserved radish, dried shrimp, and chili flakes.'),
  (3, 5, 'Heat a wok or a large nonstick skillet over high heat and add just enough oil to coat the bottom. Sear shrimp, or whatever protein you are using, until done and remove them from pan.'),
  (3, 6, 'In the same wok over medium heat, add a little more oil if needed, then add everything in the tofu bowl and sauté for a few minutes until garlic starts to turn golden and shallots are wilted. If the wok looks dry, add a little more oil. (Do not skimp on oil otherwise the noodles will clump up together.) '),
  (3, 7, 'Turn heat up to high then add noodles and sauce. Keep tossing until all the sauce is absorbed.'),
  (3, 8, 'Once sauce is absorbed, you can turn off the heat and taste the noodles for doneness. If they are still undercooked, add a little more water and continue cooking, being careful not to add too much water!'),
  (3, 9, 'Once noodles are done, push them to one side of the pan. Add add little extra oil to the empty space and add eggs. Break the yolks, then put noodles on top of eggs and cook for about 30 seconds. Flip and toss to mix eggs into noodles.'),
  (3, 10, 'Toss the cooked protein back in, plus any collected juices. Then add bean sprouts, garlic chives and half of the peanuts. Turn off the heat and toss until well mixed.'),
  (3, 11, 'Serve immediately with a lime wedge and extra peanuts on top. For a classic presentation you can add a little extra side of bean sprouts and some garlic chives garnish.'),
  (3, 12, 'Be sure to squeeze a bit of lime on top before eating!'),  
  (4, 1, 'Take the pork chops out of the fridge 15-30 minutes prior to starting the recipe if possible. Season the pork generously with salt & pepper on both sides.'),
  (4, 2, 'In a deep skillet, add the olive oil and 1 tablespoon of the butter over medium-high heat. Let the pan heat up for a few minutes, and once it is hot, cook the pork chops for 3-5 minutes/side or until golden (3 minutes for thinner chops and 5 minutes for pork chops up to 1" thick). Once the pork chops are done searing, transfer them to a plate.'),
  (4, 3, 'Add the remaining butter and the garlic cloves to the skillet. Turn the heat down to medium (or medium-low if using cast iron). Cook it, stirring fairly often, for about 3 minutes or until the garlic has somewhat browned on the outside.'),
  (4, 4, 'Push the garlic to one side of the pan and sprinkle the flour in (avoiding the garlic). Let it cook for around 30 seconds, and give it a stir so it is incorporated with the butter (we are making a quick roux).'),
  (4, 5, 'Add in the chicken broth and lemon juice. Stir and let it cook for about a minute or until the sauce is noticeably thickened.'),
  (4, 6, 'Add in the garlic powder and cream. Stir or whisk it until the garlic powder has dissolved.'),
  (4, 7, 'Add the pork back in and cook for another 3-5 minutes or until the sauce has thickened up a bit (let the sauce bubble a bit but not furiously boil) and the pork chops are fully cooked through (145F minimum). Keep in mind the pork`s temperature will continue to rise once you stop cooking it, so if it is close, I would take it off the heat and let it rest for a few minutes before serving. Season the sauce with extra salt & pepper as needed and parsley if you wish.'),
  (5, 1, 'Boil the potatoes in salted boiling water until tender'),
  (5, 2, 'Meanwhile, finely chop the spring onions on the diagonal and dice the cornichons'),  
  (5, 3, 'Drain the potatoes and roughly crush them (still in their skins) with a potato masher.  Add the butter if using.  Stir in the spring onions and cornichons, then fold in the cheese.  Taste and season as necessary, then serve');






