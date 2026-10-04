//! Small deterministic random generator for synthetic data

const STATE_INCREMENT: u64 = 0x9e37_79b9_7f4a_7c15;
const FIRST_MIX_MULTIPLIER: u64 = 0xbf58_476d_1ce4_e5b9;
const SECOND_MIX_MULTIPLIER: u64 = 0x94d0_49bb_1331_11eb;
const FIRST_SHIFT: u32 = 30;
const SECOND_SHIFT: u32 = 27;
const LAST_SHIFT: u32 = 31;

/// SplitMix64 state makes every book-count run share the same random prefix.
pub(super) struct Random {
    state: u64,
}

impl Random {
    pub fn new(seed: u64) -> Self {
        Self { state: seed }
    }

    /// Advances the published SplitMix64 mixing sequence with wrapping arithmetic.
    fn next(&mut self) -> u64 {
        self.state = self.state.wrapping_add(STATE_INCREMENT);
        let mut mixed = self.state;
        mixed = (mixed ^ (mixed >> FIRST_SHIFT)).wrapping_mul(FIRST_MIX_MULTIPLIER);
        mixed = (mixed ^ (mixed >> SECOND_SHIFT)).wrapping_mul(SECOND_MIX_MULTIPLIER);
        mixed ^ (mixed >> LAST_SHIFT)
    }

    pub fn between(&mut self, minimum: u64, maximum: u64) -> u64 {
        minimum + self.next() % (maximum - minimum + 1)
    }

    /// Supplies synthetic metadata from the seeded random sequence.
    pub fn string(&mut self) -> String {
        format!("{:x}", self.next())
    }
}
