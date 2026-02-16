import { parseFlexData } from "../../services/flexParser.js";

const mockSection = {
  name: 'FOH',
  upstreamLink: { elementName: 'Festival 2024' },
  children: [
    {
      resourceId: 'res-001',
      name: 'Shure SM58',
      quantity: 4,
      note: null,
      isVirtual: false,
      children: []
    }
  ]
}

describe('parseFlexData', () => {

  // --- Invalid / empty input ---

  it('returns empty result when given an empty array', () => {
    // arrange
    const input: any[] = []

    // act
    const result = parseFlexData(input)

    // assert
    expect(result.job.name).toBe('')
    expect(result.rackDrawings).toHaveLength(0)
    expect(result.looseEquipment).toHaveLength(0)
  })

  it('returns empty result for non-array input', () => {
    const result = parseFlexData(null)
    expect(result.rackDrawings).toHaveLength(0)
  })

  // --- Job name extraction ---

  it('extracts the job name from the first section', () => {
    const result = parseFlexData([mockSection])
    expect(result.job.name).toBe('Festival 2024')
  })

  // --- Loose equipment ---

  it('puts non-rack equipment into looseEquipment', () => {
    const result = parseFlexData([mockSection])

    expect(result.looseEquipment).toHaveLength(1)
    expect(result.looseEquipment[0]?.name).toBe('Shure SM58')
    expect(result.looseEquipment[0]?.flexSection).toBe('FOH')
  })

  it('returns 0 rack units for items with no RU in name', () => {
    const input = [{
      name: 'FOH',
      upstreamLink: { elementName: 'Test Show' },
      children: [{
        resourceId: 'res-999',
        name: 'Shure SM58',  // no RU in name
        quantity: 1,
        note: null,
        children: []
      }]
    }]

    const result = parseFlexData(input)
    expect(result.looseEquipment[0]?.rackUnits).toBe(0)
  })

  // --- Rack detection ---

  it('detects a rack and puts it in rackDrawings', () => {
    const input = [{
      name: 'FOH',
      upstreamLink: { elementName: 'Festival 2024' },
      children: [{
        resourceId: 'rack-001',
        name: 'FOH 14-Space Rack',
        quantity: 1,
        note: null,
        children: []
      }]
    }]

    const result = parseFlexData(input)

    expect(result.rackDrawings).toHaveLength(1)
    expect(result.rackDrawings[0]?.totalSpaces).toBe(14)
    expect(result.looseEquipment).toHaveLength(0)
  })

  it('collects multiple racks from the same section', () => {
    const input = [{
      name: 'FOH',
      upstreamLink: { elementName: 'Test Show' },
      children: [
        { resourceId: 'rack-001', name: 'FOH 14-Space Rack', note: null, children: [] },
        { resourceId: 'rack-002', name: 'FOH 8-Space Rack', note: null, children: [] }
      ]
    }]

    const result = parseFlexData(input)
    expect(result.rackDrawings).toHaveLength(2)
    expect(result.rackDrawings[0]?.totalSpaces).toBe(14)
    expect(result.rackDrawings[1]?.totalSpaces).toBe(8)
  })

  // --- Virtual packages ---

  it('recurses into virtual packages without adding them as equipment', () => {
    // isVirtual: true items are grouping containers, not real equipment
    const input = [{
      name: 'FOH',
      upstreamLink: { elementName: 'Test Show' },
      children: [{
        resourceId: 'group-001',
        name: 'Wireless Package',
        isVirtual: true,
        children: [{
          resourceId: 'res-001',
          name: 'Shure ULXD4',
          quantity: 2,
          note: null,
          isVirtual: false,
          children: []
        }]
      }]
    }]

    const result = parseFlexData(input)
    // The virtual parent is NOT added — only its children appear
    expect(result.looseEquipment).toHaveLength(1)
    expect(result.looseEquipment[0]?.name).toBe('Shure ULXD4')
    expect(result.looseEquipment[0]?.quantity).toBe(2)
  })

  // --- Double-wide racks ---

  it('detects a doublewide rack', () => {
    const input = [{
      name: 'FOH',
      upstreamLink: { elementName: 'Test Show' },
      children: [{
        resourceId: 'rack-001',
        name: 'FOH 14-Space Doublewide Rack',
        quantity: 1,
        note: null,
        children: []
      }]
    }]

    const result = parseFlexData(input)
    expect(result.rackDrawings[0]?.isDoubleWide).toBe(true)
  })

  it('marks a normal rack as not doublewide', () => {
    const input = [{
      name: 'FOH',
      upstreamLink: { elementName: 'Test Show' },
      children: [{
        resourceId: 'rack-001',
        name: 'FOH 14-Space Rack',
        quantity: 1,
        note: null,
        children: []
      }]
    }]

    const result = parseFlexData(input)
    expect(result.rackDrawings[0]?.isDoubleWide).toBe(false)
  })

  // --- Equipment inside racks ---

  it('places equipment inside a rack into rackDrawing.equipment', () => {
    const input = [{
      name: 'FOH',
      upstreamLink: { elementName: 'Test Show' },
      children: [{
        resourceId: 'rack-001',
        name: 'FOH 14-Space Rack',
        note: null,
        children: [{
          resourceId: 'res-001',
          name: 'Yamaha CL5 4RU',
          quantity: 1,
          note: null,
          children: []
        }]
      }]
    }]

    const result = parseFlexData(input)
    expect(result.rackDrawings[0]?.equipment).toHaveLength(1)
    expect(result.rackDrawings[0]?.equipment[0]?.name).toBe('Yamaha CL5 4RU')
    expect(result.rackDrawings[0]?.equipment[0]?.rackUnits).toBe(4)
    expect(result.looseEquipment).toHaveLength(0)
  })

  it('flattens parent/child equipment inside a rack with parentflexResourceId set', () => {
    // e.g. a Stage 64 containing input/output cards
    const input = [{
      name: 'FOH',
      upstreamLink: { elementName: 'Test Show' },
      children: [{
        resourceId: 'rack-001',
        name: 'FOH 14-Space Rack',
        note: null,
        children: [{
          resourceId: 'stage-001',
          name: 'Stage 64 2RU',
          quantity: 1,
          note: null,
          children: [{
            resourceId: 'card-001',
            name: 'Input Card',
            quantity: 1,
            note: null,
            children: []
          }]
        }]
      }]
    }]

    const result = parseFlexData(input)
    const equipment = result.rackDrawings[0]?.equipment
    // Both parent and child appear in the flat list
    expect(equipment).toHaveLength(2)
    expect(equipment?.[0]?.name).toBe('Stage 64 2RU')
    expect(equipment?.[0]?.parentflexResourceId).toBeNull()
    expect(equipment?.[1]?.name).toBe('Input Card')
    expect(equipment?.[1]?.parentflexResourceId).toBe('stage-001')
  })

  it('skips a nested rack found inside another rack\'s children', () => {
    // isRack() inside flattenEquipment should skip it
    const input = [{
      name: 'FOH',
      upstreamLink: { elementName: 'Test Show' },
      children: [{
        resourceId: 'rack-001',
        name: 'FOH 14-Space Rack',
        note: null,
        children: [{
          resourceId: 'rack-002',
          name: 'Inner 4-Space Rack',  // also a rack — should be skipped
          quantity: 1,
          note: null,
          children: []
        }]
      }]
    }]

    const result = parseFlexData(input)
    expect(result.rackDrawings[0]?.equipment).toHaveLength(0)
  })

  // --- Real equipment with children (non-virtual, non-rack) as loose ---

  it('flattens real equipment with children into looseEquipment', () => {
    // Non-virtual item with children: parent + children go into looseEquipment
    const input = [{
      name: 'FOH',
      upstreamLink: { elementName: 'Test Show' },
      children: [{
        resourceId: 'stage-001',
        name: 'Stage 64 2RU',
        quantity: 1,
        note: null,
        isVirtual: false,
        children: [{
          resourceId: 'card-001',
          name: 'Input Card',
          quantity: 1,
          note: null,
          children: []
        }]
      }]
    }]

    const result = parseFlexData(input)
    expect(result.looseEquipment).toHaveLength(2)
    expect(result.looseEquipment[0]?.name).toBe('Stage 64 2RU')
    expect(result.looseEquipment[1]?.parentflexResourceId).toBe('stage-001')
  })

  // --- Notes ---

  it('preserves notes on loose equipment', () => {
    const input = [{
      name: 'FOH',
      upstreamLink: { elementName: 'Test Show' },
      children: [{
        resourceId: 'res-001',
        name: 'Shure SM58',
        quantity: 1,
        note: 'Check for damage',
        children: []
      }]
    }]

    const result = parseFlexData(input)
    expect(result.looseEquipment[0]?.notes).toBe('Check for damage')
  })

  it('preserves notes on racks', () => {
    const input = [{
      name: 'FOH',
      upstreamLink: { elementName: 'Test Show' },
      children: [{
        resourceId: 'rack-001',
        name: 'FOH 14-Space Rack',
        note: 'Needs new latch',
        children: []
      }]
    }]

    const result = parseFlexData(input)
    expect(result.rackDrawings[0]?.notes).toBe('Needs new latch')
  })

  // --- Multiple sections ---

  it('collects equipment from multiple sections', () => {
    const foh = {
      name: 'FOH',
      upstreamLink: { elementName: 'Test Show' },
      children: [{
        resourceId: 'res-001',
        name: 'Shure SM58',
        quantity: 1,
        note: null,
        children: []
      }]
    }
    const mon = {
      name: 'MON',
      children: [{
        resourceId: 'res-002',
        name: 'Sennheiser EW 300',
        quantity: 1,
        note: null,
        children: []
      }]
    }

    const result = parseFlexData([foh, mon])
    expect(result.looseEquipment).toHaveLength(2)
    expect(result.looseEquipment[0]?.flexSection).toBe('FOH')
    expect(result.looseEquipment[1]?.flexSection).toBe('MON')
  })

  it('only takes job name from the first section that has one', () => {
    const foh = {
      name: 'FOH',
      upstreamLink: { elementName: 'First Show' },
      children: []
    }
    const mon = {
      name: 'MON',
      upstreamLink: { elementName: 'Should Not Override' },
      children: []
    }

    const result = parseFlexData([foh, mon])
    expect(result.job.name).toBe('First Show')
  })

  it('handles a section with no upstreamLink', () => {
    const input = [{
      name: 'FOH',
      // no upstreamLink
      children: []
    }]

    const result = parseFlexData(input)
    expect(result.job.name).toBe('')
  })

  // --- Rack space count formats ---

  it('defaults totalSpaces to 0 when rack name has no space count', () => {
    const input = [{
      name: 'FOH',
      upstreamLink: { elementName: 'Test Show' },
      children: [{
        resourceId: 'rack-001',
        name: 'FOH Rack Space',  // matches isRack() but no leading number
        note: null,
        children: []
      }]
    }]

    const result = parseFlexData(input)
    expect(result.rackDrawings[0]?.totalSpaces).toBe(0)
  })

  it('extracts space count when name uses a space instead of a hyphen', () => {
    const input = [{
      name: 'FOH',
      upstreamLink: { elementName: 'Test Show' },
      children: [{
        resourceId: 'rack-001',
        name: 'FOH 8 Space Rack',  // "8 Space" instead of "8-Space"
        note: null,
        children: []
      }]
    }]

    const result = parseFlexData(input)
    expect(result.rackDrawings[0]?.totalSpaces).toBe(8)
  })

  // --- Quantity defaulting ---

  it('defaults quantity to 1 when not provided', () => {
    const input = [{
      name: 'FOH',
      upstreamLink: { elementName: 'Test Show' },
      children: [{
        resourceId: 'res-001',
        name: 'Shure SM58',
        // no quantity field
        note: null,
        children: []
      }]
    }]

    const result = parseFlexData(input)
    expect(result.looseEquipment[0]?.quantity).toBe(1)
  })
})
